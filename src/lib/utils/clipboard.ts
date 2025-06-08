// Utility function for copying text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers or non-secure contexts
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            return true;
        }
    } catch (error) {
        console.error('Failed to copy text: ', error);
        return false;
    }
}

// Action for Svelte 5 that adds click-to-copy functionality
export function copy(node: HTMLElement, text: string) {
    const handleClick = async () => {
        const success = await copyToClipboard(text);
        if (success) {
            // Optional: Show a visual feedback
            node.style.transition = 'all 0.2s ease';
            const originalBg = node.style.backgroundColor;
            node.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
            setTimeout(() => {
                node.style.backgroundColor = originalBg;
            }, 200);
        }
    };

    node.addEventListener('click', handleClick);
    node.style.cursor = 'pointer';
    node.title = 'Click to copy';

    return {
        update(newText: string) {
            text = newText;
        },
        destroy() {
            node.removeEventListener('click', handleClick);
        }
    };
}
