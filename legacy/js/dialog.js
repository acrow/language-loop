// Custom Dialog System - Replaces browser alert/confirm/prompt with styled modals
class DialogManager {
    constructor() {
        this.currentResolve = null;
    }

    // Show alert dialog
    async alert(message, title = 'Notice') {
        return new Promise((resolve) => {
            this.currentResolve = resolve;

            document.getElementById('dialog-title').textContent = title;
            document.getElementById('dialog-message').textContent = message;
            document.getElementById('dialog-input-group').style.display = 'none';
            document.getElementById('dialog-cancel-btn').style.display = 'none';
            document.getElementById('dialog-ok-btn').textContent = 'OK';

            this.showDialog();
        });
    }

    // Show confirm dialog
    async confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            this.currentResolve = resolve;

            document.getElementById('dialog-title').textContent = title;
            document.getElementById('dialog-message').textContent = message;
            document.getElementById('dialog-input-group').style.display = 'none';
            document.getElementById('dialog-cancel-btn').style.display = 'inline-block';
            document.getElementById('dialog-ok-btn').textContent = 'Confirm';

            this.showDialog();
        });
    }

    // Show prompt dialog
    async prompt(message, title = 'Input', defaultValue = '') {
        return new Promise((resolve) => {
            this.currentResolve = resolve;

            document.getElementById('dialog-title').textContent = title;
            document.getElementById('dialog-message').textContent = message;
            document.getElementById('dialog-input-group').style.display = 'block';
            document.getElementById('dialog-input').value = defaultValue;
            document.getElementById('dialog-cancel-btn').style.display = 'inline-block';
            document.getElementById('dialog-ok-btn').textContent = 'OK';

            this.showDialog();

            // Focus input
            setTimeout(() => {
                document.getElementById('dialog-input').focus();
                document.getElementById('dialog-input').select();
            }, 100);
        });
    }

    showDialog() {
        document.getElementById('custom-dialog-modal').classList.remove('hidden');
    }

    hideDialog() {
        document.getElementById('custom-dialog-modal').classList.add('hidden');
    }

    handleOk() {
        const inputGroup = document.getElementById('dialog-input-group');
        const isPrompt = inputGroup.style.display !== 'none';

        if (isPrompt) {
            const value = document.getElementById('dialog-input').value;
            this.currentResolve(value);
        } else {
            this.currentResolve(true);
        }

        this.hideDialog();
    }

    handleCancel() {
        const inputGroup = document.getElementById('dialog-input-group');
        const isPrompt = inputGroup.style.display !== 'none';

        if (isPrompt) {
            this.currentResolve(null);
        } else {
            this.currentResolve(false);
        }

        this.hideDialog();
    }

    init() {
        // Setup event listeners
        document.getElementById('dialog-ok-btn')?.addEventListener('click', () => {
            this.handleOk();
        });

        document.getElementById('dialog-cancel-btn')?.addEventListener('click', () => {
            this.handleCancel();
        });

        // Handle Enter key in prompt
        document.getElementById('dialog-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleOk();
            }
        });

        // Handle Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('custom-dialog-modal').classList.contains('hidden')) {
                this.handleCancel();
            }
        });
    }
}

// Create global instance
const dialog = new DialogManager();
