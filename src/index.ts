import { config } from "dotenv";
import TelegramBot from "node-telegram-bot-api"
import { Quiz, Score } from "./quiz";
import { one, two } from "./quiz/quizes";
config()

const token = process.env.BOT_TOKEN

if (!token) {
    console.error("Bot token is not present...")
    process.exit()
}

const bot = new TelegramBot(token, {polling: true})

const quiz = new Quiz("two", two)

const response = (answer: string, name: string) => {
    const spacer = "-----------------"

    return `${spacer}\nRiktig, ${name}!\n\nSvaret var: ${answer}.\n${spacer}`;
}

const scoreboard = async (chatId: number, scores: Score[]) => {
    const users: {
        place: number,
        name: string,
        score: number,
    }[] = []

    for (let i = 0; i < scores.length; i++) {
        if (i > 9) {
            break
        }
        const score = scores[i]
        const user = await bot.getChatMember(chatId, score.userId)
        users.push({
            place: i + 1,
            name: user.user.first_name + (user.user.last_name ?? ""),
            score: score.score * 10
        })
    }
    await bot.sendMessage(
        chatId, users.map(u => `${u.place}. ${u.name} - ${u.score}`).join("\n"))
}

bot.onText(/(.*)/, async (msg, match) => {
    if (match?.[0] === "/start" && msg.from?.username === "FredrikV") {
        quiz.pause = true
        await bot.sendMessage(msg.chat.id, "Er dere klare for en interessant, insane, livsfarlig og original quiz som definitivt ikke er generert av en AI?")
        await new Promise(r => setTimeout(r, 2000))
        await bot.sendMessage(msg.chat.id, "Vi kan garantere deg at dette ikke er en samling av tilfeldige spørsmål generert av en kraftig datamaskin med tilgang til internett. Absolutt ikke.")
        await new Promise(r => setTimeout(r, 5000))
        await bot.sendMessage(msg.chat.id, "Vi har brukt uker på å nøye håndplukke hvert spørsmål fra gamle leksikoner og støvete faktabøker som ikke en gang bibliotekarer ville plukket opp.")
        await new Promise(r => setTimeout(r, 5000))

        await bot.sendMessage(msg.chat.id, "Regler: \n - 10 poeng til første person som svarer riktig \n - Maks 30 sekunder per spørsmål \n - Vinneren er den med flest poeng etter alle spørsmåla")

        await new Promise(r => setTimeout(r, 5000))

        await bot.sendMessage(msg.chat.id, "Lykke til... Dere kommer til å trenge det.")

        await new Promise(r => setTimeout(r, 5000))
    
        await bot.sendMessage(msg.chat.id, "Første spørsmål: \n\n" + quiz.currentQuestion.question)

        quiz.pause = false

        return
    }

    if (match) {
        const a = quiz.answer(msg.from!.id, match[0])
        if (a) {
            await bot.sendMessage(msg.chat.id, response(a, msg.from!.first_name), {reply_to_message_id: msg.message_id})
            if (quiz.currentIndex < (quiz.questions.length -1)) {
                await bot.sendMessage(msg.chat.id, `Nytt spørsmål kommer om litt`)

                if (quiz.currentIndex % 3 === 0) {
                    await bot.sendMessage(msg.chat.id, `Foreløpig stilling:`)
                    await scoreboard(msg.chat.id, quiz.scores())
                }
            }

            const nextQuestion = async () => {
                const q = quiz.nextQuestion()
                if (q) {
                    await bot.sendMessage(msg.chat.id, q)
                    const i = quiz.currentIndex
                    setTimeout(async () => {
                        if (quiz.currentIndex === i) {
                            quiz.currentIndex++;
                            await bot.sendMessage(msg.chat.id, "Var den for vanskelig? Neste spørsmål da...")
                            nextQuestion()
                        }
                    }, 30000)
                } else {
                    await bot.sendMessage(msg.chat.id, "----------------\nDet var siste spørsmål! \n\nGratulerer til vinnerne! \n")
                    await scoreboard(msg.chat.id, quiz.scores())
                }
            }

            setTimeout(nextQuestion, 5000)
        }
    }
})

bot.on("polling_error", (err) => {
    console.log(err)
})