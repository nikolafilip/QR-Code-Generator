import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';
import qrcodejs from '@salesforce/resourceUrl/qrcodejs';

export default class QrCodeGenerator extends LightningElement {
    @api hideControls = false;
    @api errorCorrectionLevel = 'H';
    @api qrSize = 400;
    
    _text = '';
    @api 
    get text() {
        return this._text;
    }
    set text(value) {
        this._text = value;
        // Auto-generate QR code if text is provided via API and library is loaded
        if (this.qrCodeInitialized && value) {
            // Use setTimeout to ensure DOM is updated before we try to render
            setTimeout(() => {
                this.generateQRCode();
            }, 0);
        }
    }
    
    @track isQRGenerated = false;
    @track isSaving = false;
    
    // Define options in JavaScript instead of HTML
    get errorCorrectionOptions() {
        return [
            { label: 'Low (7%)', value: 'L' },
            { label: 'Medium (15%)', value: 'M' },
            { label: 'Quartile (25%)', value: 'Q' },
            { label: 'High (30%)', value: 'H' }
        ];
    }
    
    qrCodeInitialized = false;
    
    renderedCallback() {
        if (this.qrCodeInitialized) {
            return;
        }
        
        Promise.all([
            loadScript(this, qrcodejs)
        ])
        .then(() => {
            this.qrCodeInitialized = true;
            // Auto-generate QR code if text is provided via API
            if (this._text) {
                this.generateQRCode();
            }
        })
        .catch(error => {
            this.showToast('Error', 'Error loading QR Code library: ' + this.reduceErrors(error), 'error');
        });
    }
    
    get isSaveButtonDisabled() {
        return !this.isQRGenerated || this.isSaving;
    }
    
    handleSizeChange(event) {
        this.qrSize = parseInt(event.target.value, 10);
    }
    
    handleErrorLevelChange(event) {
        this.errorCorrectionLevel = event.target.value;
    }
    
    handleInputChange(event) {
        this._text = event.target.value;
    }
    
    handleGenerate() {
        this.generateQRCode();
    }
    
    generateQRCode() {
        if (!this._text) {
            if (!this.hideControls) {
                this.showToast('Error', 'Please enter text to generate a QR code', 'error');
            }
            return;
        }
        
        if (!this.qrCodeInitialized) {
            if (!this.hideControls) {
                this.showToast('Error', 'QR Code library not loaded yet. Please try again.', 'error');
            }
            return;
        }
        
        // Get the canvas container
        const container = this.template.querySelector('.qr-code-container');
        if (!container) {
            if (!this.hideControls) {
                this.showToast('Error', 'QR Code container not found', 'error');
            }
            return;
        }
        
        // Clear previous QR code
        container.innerHTML = '';
        
        // Create new QR code with QRCode.js library
        try {
            // eslint-disable-next-line no-undef
            new QRCode(container, {
                text: this._text,
                width: this.qrSize,
                height: this.qrSize,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: this.getQRErrorCorrectLevel()
            });
            
            this.isQRGenerated = true;
        } catch (error) {
            if (!this.hideControls) {
                this.showToast('Error', 'Error generating QR code: ' + this.reduceErrors(error), 'error');
            }
        }
    }
    
    getQRErrorCorrectLevel() {
        // eslint-disable-next-line no-undef
        switch (this.errorCorrectionLevel) {
            case 'L':
                return QRCode.CorrectLevel.L; // 7% error correction
            case 'M':
                return QRCode.CorrectLevel.M; // 15% error correction
            case 'Q':
                return QRCode.CorrectLevel.Q; // 25% error correction
            case 'H':
            default:
                return QRCode.CorrectLevel.H; // 30% error correction
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
    
    // Helper method to extract error messages
    reduceErrors(error) {
        if (typeof error === 'string') {
            return error;
        }
        
        // UI API read errors
        if (Array.isArray(error.body)) {
            return error.body.map(e => e.message).join(', ');
        }
        
        // UI API DML, Apex and network errors
        else if (error.body && typeof error.body.message === 'string') {
            return error.body.message;
        }
        
        // JS errors
        else if (typeof error.message === 'string') {
            return error.message;
        }
        
        // Unknown error shape
        return 'Unknown error';
    }
}