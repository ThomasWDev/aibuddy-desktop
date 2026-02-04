import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * AIBuddy Desktop Main App Page Object
 * 
 * Encapsulates selectors and actions for the main chat interface.
 */
export class AppPage extends BasePage {
  // Input area
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly attachButton: Locator;
  
  // Messages
  readonly messageList: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  
  // Settings
  readonly settingsButton: Locator;
  readonly settingsModal: Locator;
  readonly apiKeyInput: Locator;
  readonly saveSettingsButton: Locator;
  
  // Status
  readonly statusIndicator: Locator;
  readonly creditsDisplay: Locator;
  
  // Actions
  readonly newChatButton: Locator;
  readonly historyButton: Locator;
  readonly retryButton: Locator;
  
  // Panels
  readonly knowledgePanel: Locator;
  readonly historySidebar: Locator;

  constructor(page: Page) {
    super(page);
    
    // Input area - use placeholders and roles for stability
    this.chatInput = page.getByPlaceholder(/ask aibuddy|type a message|what can I help/i);
    this.sendButton = page.getByRole('button', { name: /send/i });
    this.attachButton = page.getByRole('button', { name: /attach/i });
    
    // Messages container
    this.messageList = page.locator('[data-testid="message-list"]');
    this.userMessages = page.locator('[data-testid="user-message"]');
    this.assistantMessages = page.locator('[data-testid="assistant-message"]');
    
    // Settings
    this.settingsButton = page.getByRole('button', { name: /settings/i });
    this.settingsModal = page.locator('[data-testid="settings-modal"]');
    this.apiKeyInput = page.getByPlaceholder(/api key/i);
    this.saveSettingsButton = page.getByRole('button', { name: /save/i });
    
    // Status indicators
    this.statusIndicator = page.locator('[data-testid="status-indicator"]');
    this.creditsDisplay = page.locator('[data-testid="credits-display"]');
    
    // Action buttons
    this.newChatButton = page.getByRole('button', { name: /new chat|new conversation/i });
    this.historyButton = page.getByRole('button', { name: /history/i });
    this.retryButton = page.getByRole('button', { name: /retry/i });
    
    // Side panels
    this.knowledgePanel = page.locator('[data-testid="knowledge-panel"]');
    this.historySidebar = page.locator('[data-testid="history-sidebar"]');
  }

  /**
   * Send a message in the chat
   */
  async sendMessage(message: string) {
    await this.chatInput.fill(message);
    await this.sendButton.click();
  }

  /**
   * Wait for assistant response
   */
  async waitForResponse(timeout = 30000) {
    // Wait for loading to complete
    await this.page.waitForFunction(
      () => !document.querySelector('[data-testid="loading-indicator"]'),
      { timeout }
    );
    // Wait for new assistant message
    await expect(this.assistantMessages.last()).toBeVisible({ timeout });
  }

  /**
   * Get the last assistant message text
   */
  async getLastResponse(): Promise<string> {
    const lastMessage = this.assistantMessages.last();
    return await lastMessage.textContent() || '';
  }

  /**
   * Open settings modal
   */
  async openSettings() {
    await this.settingsButton.click();
    await expect(this.settingsModal).toBeVisible();
  }

  /**
   * Set API key in settings
   */
  async setApiKey(apiKey: string) {
    await this.openSettings();
    await this.apiKeyInput.fill(apiKey);
    await this.saveSettingsButton.click();
  }

  /**
   * Start a new chat
   */
  async startNewChat() {
    await this.newChatButton.click();
    // Wait for messages to clear
    await this.page.waitForTimeout(500);
  }

  /**
   * Open history sidebar
   */
  async openHistory() {
    await this.historyButton.click();
    await expect(this.historySidebar).toBeVisible();
  }

  /**
   * Get current status text
   */
  async getStatus(): Promise<string> {
    return await this.statusIndicator.textContent() || '';
  }

  /**
   * Get current credits
   */
  async getCredits(): Promise<string> {
    return await this.creditsDisplay.textContent() || '';
  }

  /**
   * Check if app is ready (input enabled)
   */
  async isAppReady(): Promise<boolean> {
    return await this.chatInput.isEnabled();
  }

  /**
   * Retry last failed request
   */
  async retry() {
    await this.retryButton.click();
  }

  /**
   * Close any open modal
   */
  async closeModal() {
    // Press Escape to close modals
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  /**
   * Use keyboard shortcut
   */
  async useShortcut(shortcut: string) {
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+${shortcut}`);
  }

  /**
   * Check if there are any error messages visible
   */
  async hasErrorMessage(): Promise<boolean> {
    const errorElements = this.page.locator('[role="alert"], .error, [data-testid="error-message"]');
    const count = await errorElements.count();
    return count > 0;
  }

  /**
   * Get all visible error messages
   */
  async getErrorMessages(): Promise<string[]> {
    const errors = this.page.locator('[role="alert"], .error, [data-testid="error-message"]');
    const messages: string[] = [];
    const count = await errors.count();
    for (let i = 0; i < count; i++) {
      const text = await errors.nth(i).textContent();
      if (text) messages.push(text);
    }
    return messages;
  }
}
