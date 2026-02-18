{{-- AIBuddy Desktop Download Page for denvermobileappdeveloper.com --}}
{{-- Save to: resources/views/aibuddy-desktop.blade.php --}}
{{-- Route: Route::get('/aibuddy-desktop', fn() => view('aibuddy-desktop')); --}}

@extends('layouts.app')

@section('title', 'AIBuddy Desktop - AI Coding Assistant')

@section('content')
<div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
    {{-- Hero Section --}}
    <div class="container mx-auto px-4 py-16">
        <div class="text-center mb-12">
            <div class="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500 to-orange-400 mb-6 shadow-2xl">
                <svg class="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
            </div>
            <h1 class="text-5xl md:text-6xl font-black text-white mb-4">
                AIBuddy Desktop
            </h1>
            <p class="text-xl md:text-2xl text-purple-200 mb-2">
                Your Intelligent AI Coding Partner
            </p>
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/50">
                <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span class="text-green-400 font-semibold">Version 1.5.59</span>
            </div>
        </div>

        {{-- Download Cards --}}
        <div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {{-- macOS --}}
            <div class="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 hover:border-purple-500 transition-all hover:scale-105">
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-700 flex items-center justify-center">
                        <svg class="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2">macOS</h3>
                    <p class="text-slate-400 text-sm mb-6">Apple Silicon (M1/M2/M3)</p>
                    <a href="https://aibuddy.life/downloads/v1.5.59/AIBuddy-1.5.59-arm64.dmg" 
                       class="block w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/25">
                        Download DMG
                    </a>
                    <p class="text-slate-500 text-xs mt-3">~120 MB • macOS 10.12+</p>
                </div>
            </div>

            {{-- Windows --}}
            <div class="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 hover:border-blue-500 transition-all hover:scale-105">
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-700 flex items-center justify-center">
                        <svg class="w-10 h-10 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2">Windows</h3>
                    <p class="text-slate-400 text-sm mb-6">Windows 10/11 (64-bit)</p>
                    <a href="https://aibuddy.life/downloads/v1.5.59/AIBuddy-1.5.59-Setup.exe" 
                       class="block w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-blue-500/25">
                        Download EXE
                    </a>
                    <p class="text-slate-500 text-xs mt-3">~130 MB • Windows 10+</p>
                </div>
            </div>

            {{-- Linux --}}
            <div class="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 hover:border-orange-500 transition-all hover:scale-105">
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-700 flex items-center justify-center">
                        <svg class="w-10 h-10 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.468v.024c.016.267.089.468.157.63l.003.003c.022.07-.016.128-.056.2l-.024.029a.5.5 0 01-.135.132.226.226 0 01-.064.016.313.313 0 01-.132-.016.18.18 0 01-.056-.024.054.054 0 01-.008-.006l-.003-.003c-.06-.064-.112-.133-.134-.2-.136-.27-.212-.533-.218-.863v-.024c-.004-.334.073-.671.21-.94a.96.96 0 01.329-.33c.148-.087.294-.132.457-.132z"/>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2">Linux</h3>
                    <p class="text-slate-400 text-sm mb-6">Ubuntu, Debian, Fedora</p>
                    <a href="https://aibuddy.life/downloads/v1.5.59/AIBuddy-1.5.59.AppImage" 
                       class="block w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg hover:shadow-orange-500/25">
                        Download AppImage
                    </a>
                    <p class="text-slate-500 text-xs mt-3">~140 MB • glibc 2.17+</p>
                </div>
            </div>
        </div>

        {{-- Features Section --}}
        <div class="max-w-4xl mx-auto">
            <h2 class="text-3xl font-bold text-white text-center mb-8">What's New in v1.4.32</h2>
            <div class="grid md:grid-cols-2 gap-4">
                <div class="flex items-start gap-3 p-4 bg-slate-800/30 rounded-xl">
                    <span class="text-2xl">🎤</span>
                    <div>
                        <h4 class="font-semibold text-white">Voice Input</h4>
                        <p class="text-sm text-slate-400">Dictate your code with speech-to-text</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 p-4 bg-slate-800/30 rounded-xl">
                    <span class="text-2xl">🔗</span>
                    <div>
                        <h4 class="font-semibold text-white">Share Conversations</h4>
                        <p class="text-sm text-slate-400">Create shareable links for your chats</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 p-4 bg-slate-800/30 rounded-xl">
                    <span class="text-2xl">📊</span>
                    <div>
                        <h4 class="font-semibold text-white">Usage Limits Display</h4>
                        <p class="text-sm text-slate-400">Track your session and weekly usage</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 p-4 bg-slate-800/30 rounded-xl">
                    <span class="text-2xl">⚡</span>
                    <div>
                        <h4 class="font-semibold text-white">902 Tests Passing</h4>
                        <p class="text-sm text-slate-400">Fully tested and production-ready</p>
                    </div>
                </div>
            </div>
        </div>

        {{-- CTA Section --}}
        <div class="text-center mt-16">
            <p class="text-slate-400 mb-4">Need an API key?</p>
            <a href="https://aibuddy.life" class="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all">
                Get your API key at aibuddy.life
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
            </a>
        </div>
    </div>
</div>
@endsection
