import * as discord from "discord.js"
import "dotenv/config"
import * as pg from "pg"
import { darkJokes } from "./jokes.js"

const pgclient = new pg.Pool({
    connectionString: process.env.POSTGRESQL_NEON_BACKEND,
    ssl: true
});

const client = new discord.Client({
    intents: [
        discord.GatewayIntentBits.Guilds,
        discord.GatewayIntentBits.GuildMessages,
        discord.GatewayIntentBits.MessageContent,
    ]
})

client.once(discord.Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`)
})

client.on(discord.Events.MessageCreate, async (ctx) => {
    if (ctx.author.bot) {
        return
    }

    if (ctx.content === "ping") {
        await ctx.channel.send("pong (dihbot NodeJS)");
        return
    }

    // dih Commands
    let msg = ctx.content.split(" ");
    if (msg[0] === "dih") {
        let uid = ctx.author.id;
        createUserIfNot(ctx);

        // GENERAL
        if(msg[1] == "joke") {
            ctx.channel.send(darkJokes[Math.floor(darkJokes.length * Math.random())])
        }

        // GAMBLING
        else if(msg[1] === "cash") {

            const result = await pgclient.query(
                `
                SELECT balance from users
                WHERE user_id = $1
                `,
                [uid]
            );

            ctx.channel.send(`**${ctx.author.displayName}**, you have **__${result.rows[0].balance ? result.rows[0].balance : "0"}__ dihs!**`);
        } else if (msg[1] == "daily") {

            let uid = ctx.author.id;

            const result = await pgclient.query(
                `
                SELECT
                    NOW() - last_daily_claim >= INTERVAL '24 hours' AS can_claim,
                    EXTRACT(EPOCH FROM (
                        last_daily_claim + INTERVAL '24 hours'
                    )) AS unix_time
                FROM users
                WHERE user_id = $1
                `,
                [uid]
            )
            
            // claim coins
            if(result.rows[0].can_claim) {
                try {
                    // claim coins
                    await pgclient.query(
                        `
                        UPDATE users
                        SET
                            balance = balance + 1000,
                            last_daily_claim = NOW()
                        WHERE user_id = $1
                        `,
                        [uid]
                    );

                    ctx.channel.send("Claimed 1000 dihs!");
                } catch(err) {
                    throw console.error("failed to claim coins: \n", err);
                }
            } else {
                // already claimed
                ctx.channel.send(`Already claimed. can claim <t:${Math.floor(result.rows[0].unix_time)}:R>`)
            }
        } else if(msg[1] == "flip") {
            const amount = Number(msg[2]);
            if (Number.isNaN(amount)) {
                ctx.channel.send(`the amount must be a number`)
                return
            };

            const sent = await ctx.channel.send(`flipping ${amount} dihs! ...`);
            
            setTimeout(async () => {
                const won = Math.random() < 0.5;
                const delta = won ? amount : -amount;

                // add/subtract winning/loosing
                const result = await pgclient.query(
                    `
                    UPDATE users
                    SET balance = balance + $1
                    WHERE user_id = $2
                    RETURNING balance;
                    `,
                    [delta, uid]
                )

                sent.edit(`you ${won ? "won" : "lost"} ${amount} dihs! new balance: **__${result.rows[0].balance}__**`);
            }, 2000);
        } else if (msg[1] == "give") {
            const mention = ctx.mentions.users.first();
            const amount = msg[3];

            if(!isNaN(amount) && mention) {
                const amountInt = parseInt(amount);
                
                if (amountInt <= 0) {
                    ctx.channel.send("amount must be positive");
                    return;
                }

                // balance
                const result = await pgclient.query(
                    `
                    SELECT balance 
                    FROM users
                    WHERE user_id = $1
                    `, [uid]
                )

                // perform transaction
                if(result.rows[0].balance >= amountInt) {
                    const isRecever = await pgclient.query(
                        `
                        SELECT 1 
                        FROM users
                        WHERE user_id = $1 
                        `, [mention.id]
                    )

                    if(isRecever.rows.length == 0) {
                        ctx.channel.send(`user <@${mention.id}> is not in our database. please tell them to do \`dih\` `);
                        return
                    }

                    pgclient.query(
                        `
                        UPDATE users
                        SET balance = CASE
                            WHEN user_id = $2 THEN balance - $1
                            WHEN user_id = $3 THEN balance + $1
                        END
                        WHERE user_id IN ($2, $3)
                        `, [amountInt, uid, mention.id] // amount, sender, rec
                    )

                    ctx.channel.send(`success! sent **__${amount}__** dihs to <@${mention.id}>`);
                } else {
                    ctx.channel.send(
                        "not enough balance"
                    )
                }


            } else {
               ctx.channel.send(
                "invalid syntax. correct: `dih give <user:mention> <amount:number>`"
                );
            }
        }
    } 
})

async function createUserIfNot(ctx) {
    try {
        const isUser = await pgclient.query(
            `
            SELECT 1
            FROM users
            WHERE user_id = $1
            `,
            [ctx.author.id]
        )

        if(isUser.rows.length == 0) {
            await pgclient.query(
                `
                INSERT INTO users (user_id)
                VALUES ($1) 
                `, [ctx.author.id]
            )            
        }
    } catch (err) {
        if (ctx) {
            ctx.channel.send("failed to add user into our database, try again")
        }
        throw console.error(err);
    }
}

client.login(process.env.DISCORD_TOKEN)