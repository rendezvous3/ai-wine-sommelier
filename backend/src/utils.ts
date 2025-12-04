
const formatConversationHistory = (messageList: Array<any>) => {
    // Use map to convert each object into a formatted string (e.g., "User: What do you got?")
    const formattedMessages = messageList.map(message => {
        // Capitalize the role for cleaner presentation (User, Assistant, System)
        const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
        
        // Return the formatted line
        return `${role}: ${message.content}`;
    });

    // Join all formatted lines with a newline character
    return formattedMessages.join('\n');
}


export {
    formatConversationHistory
}