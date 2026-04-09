import { generateStreamPrompt } from "./prompts";

const generatePrompt = (
    _model: string,
    current_query: string,
    conversation_history: string,
    products_context: string,
    clarificationContext?: string,
    _useFireAt2Prompt?: boolean,
    profileType?: string
) => {
    return generateStreamPrompt(
        current_query,
        conversation_history,
        products_context,
        clarificationContext,
        profileType
    );
}

export { generatePrompt }
