import React, { useState } from 'react'
import { Shield, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface PrivacyConsentProps {
  onAccept: () => void
}

/**
 * Apple Guideline 5.1.1(i) & 5.1.2(i) compliance.
 * Must be shown before the app sends any data to third-party AI services.
 * Clearly discloses: what data is sent, who receives it, and obtains consent.
 */
export const PrivacyConsent: React.FC<PrivacyConsentProps> = ({ onAccept }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(180deg, #0f172a, #1e293b)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8 animate-fadeIn"
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          >
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Your Privacy Matters</h1>
            <p className="text-sm text-slate-400">Before you start using AIBuddy</p>
          </div>
        </div>

        <div
          className="p-4 rounded-xl mb-4"
          style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)' }}
        >
          <p className="text-sm text-slate-200 leading-relaxed">
            AIBuddy sends your <strong className="text-white">chat messages and attached files</strong> to 
            third-party AI providers to generate responses. This is required for the app to function.
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-indigo-400 mt-0.5 text-lg">1.</span>
            <div>
              <p className="text-sm font-medium text-white">What data is sent</p>
              <p className="text-xs text-slate-400">
                Your chat messages, code snippets, and any files you attach. 
                Your API key is used for authentication only.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-indigo-400 mt-0.5 text-lg">2.</span>
            <div>
              <p className="text-sm font-medium text-white">Who receives your data</p>
              <p className="text-xs text-slate-400">
                Anthropic (Claude), OpenAI (GPT), and DeepSeek — routed automatically 
                based on your request. Data is processed per each provider's privacy policy.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-indigo-400 mt-0.5 text-lg">3.</span>
            <div>
              <p className="text-sm font-medium text-white">How we protect you</p>
              <p className="text-xs text-slate-400">
                All data is transmitted over HTTPS. We do not store your conversations 
                on our servers. Chat history is stored locally on your device only.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-indigo-400 mb-4 hover:text-indigo-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide details' : 'Show full details'}
        </button>

        {expanded && (
          <div className="mb-4 p-3 rounded-lg text-xs text-slate-400 leading-relaxed space-y-2" style={{ background: '#0f172a' }}>
            <p>
              <strong className="text-slate-300">AI Providers:</strong> Your messages are routed to 
              Anthropic (anthropic.com), OpenAI (openai.com), or DeepSeek (deepseek.com) depending 
              on task complexity. Each provider has its own data retention and privacy policies.
            </p>
            <p>
              <strong className="text-slate-300">Local Storage:</strong> Chat history, API keys, 
              and preferences are stored locally on your Mac using encrypted electron-store. 
              No conversation data is stored on AIBuddy's servers.
            </p>
            <p>
              <strong className="text-slate-300">Analytics:</strong> Basic usage analytics 
              (button clicks, feature usage) may be collected to improve the app. No message 
              content is included in analytics.
            </p>
            <p>
              <strong className="text-slate-300">Your Rights:</strong> You can delete all local 
              data at any time by removing the app. You can review our full privacy policy at:
            </p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                const electronAPI = (window as any).electronAPI
                if (electronAPI?.shell?.openExternal) {
                  electronAPI.shell.openExternal('https://aibuddy.life/privacy')
                }
              }}
              className="text-indigo-400 hover:underline"
            >
              https://aibuddy.life/privacy <ExternalLink className="w-3 h-3 inline" />
            </a>
          </div>
        )}

        <button
          onClick={onAccept}
          className="w-full py-3 rounded-xl font-bold text-base text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
          }}
        >
          I Understand — Continue
        </button>

        <p className="text-[10px] text-slate-500 text-center mt-3">
          By continuing, you consent to sending your messages to AI providers as described above.
        </p>
      </div>
    </div>
  )
}

export default PrivacyConsent
