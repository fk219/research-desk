import crypto from "crypto"
import { userModel } from "../models/user.model.js"
import { chatModel } from "../models/chat.model.js"
import { messageModel } from "../models/message.model.js"

const DEMO_EMAIL = "demo@researchdesk.local"
const DEMO_USERNAME = "demo_researcher"

const DEMO_THREADS = [
    {
        title: "Demo · Verifying an AI research answer",
        question: "What should I check before I trust an AI-generated research summary?",
        answer: `> **Demo note.** This is a static example answer, seeded so the demo desk has something to read. It was not generated live. Ask your own question to run a real web search.

A research summary is only as trustworthy as the trail behind it. Before you reuse one, check four things:

1. **Trace every claim to a source.** A good answer names the page each factual claim came from. If a sentence has no citation, treat it as a lead rather than a finding [1].
2. **Check that the source actually says it.** Summaries drift. Open the cited page and read the paragraph around the claim instead of trusting the excerpt.
3. **Prefer primary and recent material.** A standards body, peer-reviewed paper or official dataset beats a second-hand blog post, especially in fast-moving fields [2].
4. **Keep the question and the date.** A saved thread with the original question and the search date is an audit trail. Without them, the answer is impossible to re-check [3].

The useful test is not "does this sound right?" but "could a colleague reproduce this answer from the sources attached to it?" If the trail is missing, ask for it before you cite the answer.`,
        sources: [
            {
                title: "NIST AI Risk Management Framework",
                url: "https://www.nist.gov/itl/ai-risk-management-framework",
                snippet: "Example source. A voluntary framework for managing risks in AI systems, including transparency and documentation."
            },
            {
                title: "Stanford HAI · AI Index",
                url: "https://hai.stanford.edu/ai-index",
                snippet: "Example source. Annual reporting on AI research, adoption and policy trends."
            },
            {
                title: "Nature Portfolio · Editorial policies on AI",
                url: "https://www.nature.com/nature-portfolio/editorial-policies/ai",
                snippet: "Example source. Publisher guidance on how AI-generated material should be disclosed and verified."
            }
        ]
    },
    {
        title: "Demo · Carbon removal, ranked",
        question: "Which carbon removal methods are most likely to matter at scale?",
        answer: `> **Demo note.** Static example answer for the demo desk. No live search was run for this thread.

There is no single winner; the methods differ in cost, permanence and where they can be deployed.

- **Restoration and soil carbon** are cheap and available now, but storage is fragile and reversals are common. They matter most as near-term, land-based work [1].
- **Bioenergy with carbon capture and storage (BECCS)** can be large, but it competes for land, water and biomass. Its climate value depends heavily on what is grown and how the carbon is stored.
- **Direct air capture (DAC)** offers durable storage and a small land footprint, but it is energy-hungry and still expensive per tonne [2].
- **Mineralisation and enhanced weathering** promise long storage times, but measurement and deployment are immature.

A useful portfolio mixes near-term restoration with durable removal, and tracks the energy and land costs of each. The IPCC's assessment is clear that removal cannot substitute for cutting emissions; it is a complement, not an alternative [1]. Costs and project counts move quickly, so check the latest IEA and DOE trackers before quoting a figure.`,
        sources: [
            {
                title: "IPCC AR6 · Mitigation of Climate Change",
                url: "https://www.ipcc.ch/report/ar6/wg3/",
                snippet: "Example source. The Working Group III contribution on mitigation pathways and carbon removal."
            },
            {
                title: "IEA · Carbon capture, utilisation and storage",
                url: "https://www.iea.org/energy-system/carbon-capture-utilisation-and-storage",
                snippet: "Example source. Tracking of CCUS projects, capacity and investment."
            },
            {
                title: "US Department of Energy · Carbon Negative Shot",
                url: "https://www.energy.gov/fecm/carbon-negative-shot",
                snippet: "Example source. Program context for durable carbon dioxide removal at lower cost."
            }
        ]
    },
    {
        title: "Demo · A debounce hook, reviewed",
        question: "Write a performant debounce hook in React and explain the edge cases.",
        answer: `> **Demo note.** Static example answer for the demo desk. No live search was run for this thread.

The smallest reliable version stores the timer in a ref and clears it on cleanup:

\`\`\`js
import { useEffect, useRef } from "react";

export function useDebouncedCallback(callback, delay = 300) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useRef((...args) => {
    clearTimeout(callbackRef.current.timer);
    callbackRef.current.timer = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }).current;
}
\`\`\`

The important choices:

1. **Keep the latest callback in a ref.** Otherwise a stale closure fires with yesterday's state [2].
2. **Return a stable function.** A new debounced function on every render defeats the purpose and can restart consumers' effects.
3. **Clear the timer on unmount.** A timer that outlives the component calls into a torn-down tree [1].
4. **Cancel on unmount without dropping the last call** if your UI expects a save on close; that is a product decision, not a debounce default.

For a value rather than a callback, debounce into state with a \`useEffect\` and clean up the timeout. Keep the delay short enough that the UI still feels direct, and test rapid typing plus an unmount mid-delay.`,
        sources: [
            {
                title: "MDN · Window.setTimeout",
                url: "https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout",
                snippet: "Example source. Timer semantics, clearing timers and the event loop."
            },
            {
                title: "React · useCallback",
                url: "https://react.dev/reference/react/useCallback",
                snippet: "Example source. When callback identity matters and how to keep references stable."
            },
            {
                title: "React · useRef",
                url: "https://react.dev/reference/react/useRef",
                snippet: "Example source. Holding mutable values such as timer handles without re-rendering."
            }
        ]
    }
]

const findDemoUser = () => userModel.findOne({ email: DEMO_EMAIL })

const createDemoUser = async () => {
    // A random secret means the shared demo account can only be entered
    // through POST /api/auth/demo, never with a known password.
    const randomPassword = crypto.randomBytes(32).toString("hex")

    try {
        return await userModel.create({
            username: DEMO_USERNAME,
            email: DEMO_EMAIL,
            password: randomPassword,
            verified: true
        })
    } catch (error) {
        // Another request may have created the demo account first.
        if (error?.code === 11000) {
            const existing = await findDemoUser()
            if (existing) return existing

            // A legacy account may already hold the demo username. Keep the
            // demo desk working with a suffix rather than failing the login.
            return userModel.create({
                username: `${DEMO_USERNAME}_${crypto.randomBytes(2).toString("hex")}`,
                email: DEMO_EMAIL,
                password: randomPassword,
                verified: true
            })
        }
        throw error
    }
}

const ensureDemoUser = async () => {
    const existing = await findDemoUser()
    if (existing) return existing

    return createDemoUser()
}

const createDemoThread = async (userId, thread) => {
    const chat = await chatModel.create({
        user: userId,
        title: thread.title,
        pinned: thread.title === DEMO_THREADS[0].title
    })

    await messageModel.insertMany([
        {
            chat: chat._id,
            role: "user",
            content: thread.question
        },
        {
            chat: chat._id,
            role: "ai",
            content: thread.answer,
            sources: thread.sources
        }
    ])

    return chat
}

let seedQueue = Promise.resolve()

const seedDemoThreads = (userId) => {
    // Serialise seeding inside this process so two demo clicks cannot both
    // see an empty desk and create duplicate threads.
    const run = seedQueue.then(async () => {
        const existing = await chatModel.find({ user: userId }).select("title").lean()
        if (existing.length > 0) return false

        await Promise.all(DEMO_THREADS.map((thread) => createDemoThread(userId, thread)))
        return true
    })

    seedQueue = run.catch(() => {})
    return run
}

export { DEMO_EMAIL, DEMO_USERNAME, ensureDemoUser, seedDemoThreads }
