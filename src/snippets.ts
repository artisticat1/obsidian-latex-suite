export interface Snippet {
    trigger: string,
    replacement: string,
    options: string,
    description?: string,
    priority?: number
}

export interface Environment {
    openSymbol: string,
    closeSymbol: string
}

export const SNIPPET_VARIABLES = {
    "${GREEK}": "alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|Xi|pi|Pi|rho|sigma|Sigma|tau|upsilon|phi|Phi|chi|psi|Psi|omega|Omega",
    "${SYMBOL}": "hbar|ell|nabla"
};