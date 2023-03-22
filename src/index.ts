import { config } from "dotenv";
import Fuse from "fuse.js";
import TelegramBot from "node-telegram-bot-api"
import { Quiz } from "./quiz";
import { one } from "./quiz/quizes";
config()

const token = process.env.BOT_TOKEN

if (!token) {
    console.error("Bot token is not present...")
    process.exit()
}

const bot = new TelegramBot(token, {polling: true})

const quiz = new Quiz(one)

const response = (answer: string, name: string) => {
    const spacer = "-----------------"

    return `${spacer}\nRiktig, ${name}!\n\nSvaret var: ${answer}.\n${spacer}`;
}

bot.onText(/(.*)/, async (msg, match) => {
    if (match?.[0] === "/start") {
        bot.sendMessage(msg.chat.id, quiz.currentQuestion.question)
    }

    if (match) {
        if (quiz.answer(msg.from!.id, match[0])) {
            await bot.sendMessage(msg.chat.id, response(quiz.currentQuestion.answer, msg.from!.first_name), {reply_to_message_id: msg.message_id})
            if (quiz.currentIndex < (quiz.questions.length -1)) {
                await bot.sendMessage(msg.chat.id, `Nytt spørsmål kommer om litt`)

                if ((quiz.currentIndex + 1) % 3 === 0) {
                    await bot.sendMessage(msg.chat.id, `Foreløpig stilling: \n${JSON.stringify(quiz.scores())}`)
                }
            }

            setTimeout(async () => {
                const q = quiz.nextQuestion()
                if (q) {
                    await bot.sendMessage(msg.chat.id, q)
                } else {
                    const users: {
                        place: number,
                        name: string,
                        score: number,
                    }[] = []
                    const scores = quiz.scores()

                    for (let i = 0; i < scores.length; i++) {
                        if (i > 9) {
                            break
                        }
                        const score = scores[i]
                        const user = await bot.getChatMember(msg.chat.id, score.userId)
                        users.push({
                            place: i + 1,
                            name: user.user.first_name + (user.user.last_name ?? ""),
                            score: score.score * 10
                        })
                    }
                    await bot.sendMessage(
                        msg.chat.id, 
                        "Det var siste spørsmål! \n---------\nGratulerer til vinneren!\n\n" + 
                            users.map(u => `${u.place}. ${u.name} - ${u.score}`))
                }
            }, 5000)
        }
    }
})

bot.on("polling_error", (err) => {
    console.log(err)
})