import { ratio } from "fuzzball"
import { writeFile, readFileSync } from "fs"

const floor = (date: Date) => {
    return Math.floor(date.getTime()/1000)
}

export class Quiz {
    private key

    public questions

    public currentIndex = 0

    public pause = false

    public answered: {
        [key: number]: {
            userId: number
            score: number
        }
    } = {}

    public sentDate: Date = new Date()

    constructor(key: string, questions: Question[]) {
        this.key = key
        this.questions = questions

        try {
            const stateString = readFileSync(`./data/${this.key}.json`, {encoding: "utf-8"})
            const state = JSON.parse(stateString)
            this.answered = state.answered ?? {}
            this.currentIndex = state.currentIndex ?? 0
        } catch {
            // ignore errs
        }
    }

    private saveState() {
        writeFile(`./data/${this.key}.json`, JSON.stringify({
            answered: this.answered,
            currentIndex: this.currentIndex,
        }), {encoding: "utf-8"}, () => {
            console.log("saved")
        })
    }

    public get currentQuestion() {
        return this.questions[this.currentIndex]
    }

    answer(uid: number, text: string): false | string {
        if (this.pause || this.answered[this.currentIndex]) {
            return false
        }

        const current = this.questions[this.currentIndex]
        const r = ratio(current.answer, text)
        if (r >= 90) {
            this.pause = true
            const diff = floor(new Date()) - floor(this.sentDate!)
            this.answered[this.currentIndex] = {
                userId: uid,
                score: 30 - diff
            }
            this.currentIndex++

            this.saveState()
            return current.answer
        }
        return false
    }

    nextQuestion(): string | null {
        this.pause = false
        this.saveState()
        this.sentDate = new Date()
        const q = this.currentQuestion?.question
        if (q) {
            return `Spørsmål ${this.currentIndex + 1} av ${this.questions.length}: \n\n<b>${q}</b>`
        }
        return null
    }
    
    scores(): Score[] {
        const scores: Score[] = []

        for (const answer of Object.values(this.answered)) {
            const existing = scores.find(i => i.userId == answer.userId)
            if (existing) {
                existing.score += answer.score
            } else {
                scores.push({
                    userId: answer.userId,
                    score: answer.score,
                })
            }
        }

        return scores.sort((a, b) => b.score - a.score)
    }
}

export type Question = {
    question: string
    answer: string
}

export type Score = {
    userId: number
    score: number
}