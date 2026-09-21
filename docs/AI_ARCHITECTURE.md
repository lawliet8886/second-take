# AI architecture

Early fully generative prototypes sounded flexible but could invent pragmatic implications and made exact rewinds unreliable. Second Take therefore separates three concerns: understanding language, deciding which conversational actions are allowed, and realizing the chosen action.

1. The Semantic Router maps free text to a finite intent taxonomy.
2. Intent Lock lets the user explicitly resolve the high-impact capability/request pair.
3. FactGraph and ConversationPolicyEngine compute a safe candidate set.
4. Gemini Plan Selector chooses one candidate using structured output.
5. The finite Conversation Action Graph applies a local state transition.
6. An authored utterance family produces Alex's visible response.

If the selector fails after routing and policy evaluation, the backend selects a conservative candidate by deterministic fallback priority. If the router fails, it returns `TRANSPORT_FAILURE`; no safe interpretation has been established, so it does not invent one. Application deadlines bound both waits even if the provider ignores its timeout. Late completion does not apply a state transition, but the underlying transport may remain in flight until its own timeout. Hidden facts remain server-side, and the client cannot submit facts, plans, or transitions.
