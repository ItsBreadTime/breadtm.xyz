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
            const opener = document.activeElement;
            textArea.focus();
            textArea.select();
            try { return document.execCommand('copy'); }
            finally { textArea.remove(); if (opener instanceof HTMLElement) opener.focus(); }
        }
    } catch (error) {
        console.error('Failed to copy text: ', error);
        return false;
    }
}

// Action for Svelte 5 that adds click-to-copy functionality
export function copy(node: HTMLElement, text: string) {
    const status = document.createElement('span');
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    node.appendChild(status);
    const handleClick = async (event: Event) => {
        if (event.target instanceof Element && event.target.closest('a, button')) return;
        status.textContent = '';
        const success = await copyToClipboard(text);
        status.textContent = success ? 'Copied!' : 'Could not copy. Select the username and copy it manually.';
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

    const onKeydown = (event: KeyboardEvent) => {
        if (event.target !== node || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault(); void handleClick(event);
    };
    // Copy-only surfaces can be keyboard controls without changing their appearance.
    if (!node.querySelector('a, button')) {
        node.tabIndex = 0;
        node.setAttribute('role', 'button');
        node.setAttribute('aria-label', `Copy ${text}`);
    }
    node.addEventListener('keydown', onKeydown);
    node.addEventListener('click', handleClick);
    node.style.cursor = 'pointer';
    node.title = 'Click to copy';

    return {
        update(newText: string) {
            text = newText;
        },
        destroy() {
            node.removeEventListener('click', handleClick);
            node.removeEventListener('keydown', onKeydown);
            status.remove();
        }
    };
}
