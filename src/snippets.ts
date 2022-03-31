export interface Snippet {
    trigger: string,
    replacement: string,
    options: string,
    description?: string
}

export interface Environment {
    openSymbol: string,
    closeSymbol: string
}