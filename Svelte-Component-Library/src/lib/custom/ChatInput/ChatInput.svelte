<script lang="ts">

  interface ChatInputProps {
    placeholder?: string;
    value?: string;
    oninput?: (value: string) => void;
    onsend?: (value: string, options?: { 
      agent?: string; 
      model?: string; 
      temperature?: number;
      speed?: number;
      mode?: string;
    }) => void;
    onvoice?: () => void;
    onattach?: (files: FileList) => void;
    maxLength?: number;
    disabled?: boolean;
    variant?: 'default' | 'compact' | 'two-line';
    showVoice?: boolean;
    showAttach?: boolean;
    showEmoji?: boolean;
    showSend?: boolean;
    showFormatting?: boolean;
    showMentions?: boolean;
    showAgent?: boolean;
    showModel?: boolean;
    showTemperature?: boolean;
    showSpeed?: boolean;
  }

  let {
    placeholder = 'Type a message...',
    value = '',
    oninput,
    onsend,
    onvoice,
    onattach,
    maxLength,
    disabled = false,
    variant = 'default',
    showVoice = true,
    showAttach = true,
    showEmoji = true,
    showSend = true,
    showFormatting = true,
    showMentions = true,
    showAgent = true,
    showModel = true,
    showTemperature = true,
    showSpeed = true
  }: ChatInputProps = $props();

  let isTwoLine = $derived(variant === 'two-line');

  let inputValue = $state(value);
  let isRecording = $state(false);
  let isFocused = $state(false);
  let emojiPickerOpen = $state(false);
  let formattingMenuOpen = $state(false);
  let agentDropdownOpen = $state(false);
  let modelDropdownOpen = $state(false);
  let temperatureDropdownOpen = $state(false);
  let speedDropdownOpen = $state(false);
  let fileInputRef: HTMLInputElement | null = $state(null);
  
  let selectedAgent = $state('composer');
  let selectedModel = $state('gpt-4');
  let selectedTemperature = $state('balanced');
  let selectedSpeed = $state('1x');

  let inputClasses = $derived(
    [
      'chat-input',
      `chat-input--${variant}`,
      isFocused && 'chat-input--focused',
      disabled && 'chat-input--disabled',
      isTwoLine && 'chat-input--two-line'
    ]
      .filter(Boolean)
      .join(' ')
  );

  let hasValue = $derived(inputValue.trim().length > 0);
  let characterCount = $derived(inputValue.length);

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    inputValue = target.value;
    oninput?.(inputValue);
  }

  function handleSend() {
    if (inputValue.trim() && onsend) {
      onsend(inputValue.trim(), { 
        agent: agents.find(a => a.id === selectedAgent)?.label || 'Composer',
        model: models.find(m => m.id === selectedModel)?.label || 'GPT-4',
        temperature: temperatures.find(t => t.id === selectedTemperature)?.value || 0.7,
        speed: parseFloat(selectedSpeed.replace('x', ''))
      });
      inputValue = '';
      oninput?.('');
    }
  }

  function toggleDropdown(dropdown: 'agent' | 'model' | 'temperature' | 'speed' | 'formatting' | 'emoji') {
    // Close all other dropdowns
    agentDropdownOpen = false;
    modelDropdownOpen = false;
    temperatureDropdownOpen = false;
    speedDropdownOpen = false;
    formattingMenuOpen = false;
    emojiPickerOpen = false;
    
    // Toggle the selected dropdown
    if (dropdown === 'agent') agentDropdownOpen = !agentDropdownOpen;
    else if (dropdown === 'model') modelDropdownOpen = !modelDropdownOpen;
    else if (dropdown === 'temperature') temperatureDropdownOpen = !temperatureDropdownOpen;
    else if (dropdown === 'speed') speedDropdownOpen = !speedDropdownOpen;
    else if (dropdown === 'formatting') formattingMenuOpen = !formattingMenuOpen;
    else if (dropdown === 'emoji') emojiPickerOpen = !emojiPickerOpen;
  }

  // Close dropdowns when clicking outside
  $effect(() => {
    if (typeof window === 'undefined') return;
    
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.chat-input__dropdown') && 
          !target.closest('.chat-input__dropdown-button')) {
        agentDropdownOpen = false;
        modelDropdownOpen = false;
        temperatureDropdownOpen = false;
        speedDropdownOpen = false;
        formattingMenuOpen = false;
        emojiPickerOpen = false;
      }
    }

    if (agentDropdownOpen || modelDropdownOpen || temperatureDropdownOpen || 
        speedDropdownOpen || formattingMenuOpen || emojiPickerOpen) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleVoiceClick() {
    if (onvoice) {
      isRecording = !isRecording;
      onvoice();
    }
  }

  function handleAttachClick() {
    fileInputRef?.click();
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0 && onattach) {
      onattach(target.files);
    }
  }

  function toggleEmojiPicker() {
    toggleDropdown('emoji');
  }

  function insertEmoji(emoji: string) {
    inputValue += emoji;
    oninput?.(inputValue);
    emojiPickerOpen = false;
  }

  // Common emojis
  const commonEmojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  const agents = [
    { id: 'composer', label: 'Composer', icon: '✨' },
    { id: 'researcher', label: 'Researcher', icon: '🔍' },
    { id: 'coder', label: 'Coder', icon: '💻' },
    { id: 'writer', label: 'Writer', icon: '✍️' },
    { id: 'analyst', label: 'Analyst', icon: '📊' }
  ];

  const models = [
    { id: 'gpt-4', label: 'GPT-4', description: 'Most capable' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Faster' },
    { id: 'gpt-3.5', label: 'GPT-3.5', description: 'Fast & efficient' },
    { id: 'claude-3', label: 'Claude 3', description: 'Advanced reasoning' }
  ];

  const temperatures = [
    { id: 'precise', label: 'Precise', value: 0.3 },
    { id: 'balanced', label: 'Balanced', value: 0.7 },
    { id: 'creative', label: 'Creative', value: 0.9 }
  ];

  const speeds = [
    { id: '0.5x', label: '0.5x', description: 'Slower' },
    { id: '1x', label: '1x', description: 'Normal' },
    { id: '2x', label: '2x', description: 'Faster' },
    { id: '4x', label: '4x', description: 'Fastest' }
  ];
</script>

<div class={inputClasses}>
  {#if isTwoLine}
      <!-- Two-line layout: Top = text input, Bottom = action buttons -->
      <div class="chat-input__two-line-wrapper">
        <!-- Top line: Text input -->
        <div class="chat-input__top-line">
          <textarea
            class="chat-input__field chat-input__field--two-line"
            {placeholder}
            value={inputValue}
            oninput={handleInput}
            onkeydown={handleKeyDown}
            onfocus={() => isFocused = true}
            onblur={() => isFocused = false}
            {disabled}
            maxlength={maxLength}
            rows="1"
            aria-label="Message input"
          ></textarea>
          
          {#if maxLength && characterCount > maxLength * 0.8}
            <span class="chat-input__counter">
              {characterCount}{maxLength ? `/${maxLength}` : ''}
            </span>
          {/if}
        </div>

        <!-- Bottom line: Actions on left, Voice/Send on right -->
        <div class="chat-input__bottom-line">
          <div class="chat-input__bottom-left">
            {#if showAgent}
              <div class="chat-input__dropdown-wrapper">
                <button
                  class="chat-input__dropdown-button"
                  onclick={() => toggleDropdown('agent')}
                  aria-label="Select agent"
                  type="button"
                  {disabled}
                >
                  <span class="chat-input__dropdown-icon">{agents.find(a => a.id === selectedAgent)?.icon || '✨'}</span>
                  <span class="chat-input__dropdown-label">{agents.find(a => a.id === selectedAgent)?.label || 'Composer'}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="chat-input__dropdown-arrow">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                {#if agentDropdownOpen}
                  <div class="chat-input__dropdown">
                    {#each agents as agent (agent.id)}
                      <button
                        class="chat-input__dropdown-option"
                        class:chat-input__dropdown-option--active={selectedAgent === agent.id}
                        onclick={() => { selectedAgent = agent.id; agentDropdownOpen = false; }}
                        type="button"
                      >
                        <span class="chat-input__dropdown-option-icon">{agent.icon}</span>
                        <span class="chat-input__dropdown-option-label">{agent.label}</span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            {#if showModel}
              <div class="chat-input__dropdown-wrapper">
                <button
                  class="chat-input__dropdown-button"
                  onclick={() => toggleDropdown('model')}
                  aria-label="Select model"
                  type="button"
                  {disabled}
                >
                  <span class="chat-input__dropdown-label">{models.find(m => m.id === selectedModel)?.label || 'GPT-4'}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="chat-input__dropdown-arrow">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                {#if modelDropdownOpen}
                  <div class="chat-input__dropdown">
                    {#each models as model (model.id)}
                      <button
                        class="chat-input__dropdown-option"
                        class:chat-input__dropdown-option--active={selectedModel === model.id}
                        onclick={() => { selectedModel = model.id; modelDropdownOpen = false; }}
                        type="button"
                      >
                        <div class="chat-input__dropdown-option-content">
                          <span class="chat-input__dropdown-option-label">{model.label}</span>
                          <span class="chat-input__dropdown-option-desc">{model.description}</span>
                        </div>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            {#if showTemperature}
              <div class="chat-input__dropdown-wrapper">
                <button
                  class="chat-input__dropdown-button chat-input__dropdown-button--compact"
                  onclick={() => toggleDropdown('temperature')}
                  aria-label="Select temperature"
                  type="button"
                  {disabled}
                >
                  <span class="chat-input__dropdown-label">{temperatures.find(t => t.id === selectedTemperature)?.label || 'Balanced'}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="chat-input__dropdown-arrow">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                {#if temperatureDropdownOpen}
                  <div class="chat-input__dropdown">
                    {#each temperatures as temp (temp.id)}
                      <button
                        class="chat-input__dropdown-option"
                        class:chat-input__dropdown-option--active={selectedTemperature === temp.id}
                        onclick={() => { selectedTemperature = temp.id; temperatureDropdownOpen = false; }}
                        type="button"
                      >
                        <span class="chat-input__dropdown-option-label">{temp.label}</span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            {#if showSpeed}
              <div class="chat-input__dropdown-wrapper">
                <button
                  class="chat-input__dropdown-button chat-input__dropdown-button--compact"
                  onclick={() => toggleDropdown('speed')}
                  aria-label="Select speed"
                  type="button"
                  {disabled}
                >
                  <span class="chat-input__dropdown-label">{selectedSpeed}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="chat-input__dropdown-arrow">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                {#if speedDropdownOpen}
                  <div class="chat-input__dropdown">
                    {#each speeds as speed (speed.id)}
                      <button
                        class="chat-input__dropdown-option"
                        class:chat-input__dropdown-option--active={selectedSpeed === speed.id}
                        onclick={() => { selectedSpeed = speed.id; speedDropdownOpen = false; }}
                        type="button"
                      >
                        <div class="chat-input__dropdown-option-content">
                          <span class="chat-input__dropdown-option-label">{speed.label}</span>
                          <span class="chat-input__dropdown-option-desc">{speed.description}</span>
                        </div>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            {#if showAttach}
              <button
                class="chat-input__action-button"
                onclick={handleAttachClick}
                aria-label="Attach file"
                type="button"
                {disabled}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M15 7.5L10 2.5L5 7.5M15 12.5L10 17.5L5 12.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="chat-input__action-button-label">Attach</span>
              </button>
            {/if}

            {#if showEmoji}
              <button
                class="chat-input__action-button"
                onclick={() => toggleDropdown('emoji')}
                aria-label="Add emoji"
                type="button"
                {disabled}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="2"/>
                  <path d="M7 8C7.55228 8 8 7.55228 8 7C8 6.44772 7.55228 6 7 6C6.44772 6 6 6.44772 6 7C6 7.55228 6.44772 8 7 8Z" fill="currentColor"/>
                  <path d="M13 8C13.5523 8 14 7.55228 14 7C14 6.44772 13.5523 6 13 6C12.4477 6 12 6.44772 12 7C12 7.55228 12.4477 8 13 8Z" fill="currentColor"/>
                  <path d="M7 12C7 13.5 8.5 14.5 10 14.5C11.5 14.5 13 13.5 13 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span class="chat-input__action-button-label">Emoji</span>
              </button>
            {/if}

            {#if showFormatting}
              <button
                class="chat-input__action-button"
                onclick={() => toggleDropdown('formatting')}
                aria-label="Formatting options"
                type="button"
                {disabled}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5H15M5 10H15M5 15H10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span class="chat-input__action-button-label">Format</span>
              </button>
            {/if}
          </div>

          <div class="chat-input__bottom-right">
            {#if showVoice}
              <button
                class="chat-input__action-button"
                class:chat-input__action-button--recording={isRecording}
                onclick={handleVoiceClick}
                aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
                type="button"
                {disabled}
              >
                {#if isRecording}
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <rect x="6" y="6" width="8" height="8" rx="2" fill="currentColor"/>
                  </svg>
                {:else}
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3C8.89543 3 8 3.89543 8 5V9C8 10.1046 8.89543 11 10 11C11.1046 11 12 10.1046 12 9V5C12 3.89543 11.1046 3 10 3Z" stroke="currentColor" stroke-width="2"/>
                    <path d="M5 9C5 11.7614 7.23858 14 10 14C12.7614 14 15 11.7614 15 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M10 14V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                {/if}
                <span class="chat-input__action-button-label">Voice</span>
              </button>
            {/if}

            {#if showSend && hasValue}
              <button
                class="chat-input__send-button-bottom"
                onclick={handleSend}
                aria-label="Send message"
                type="button"
                {disabled}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            {:else if showSend}
              <button
                class="chat-input__send-button-bottom chat-input__send-button-bottom--always"
                onclick={handleSend}
                aria-label="Send message"
                type="button"
                {disabled}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <!-- Single line layout -->
      <div class="chat-input__container">
        <div class="chat-input__wrapper">
          {#if showAttach}
            <button
              class="chat-input__button chat-input__button--attach"
              onclick={handleAttachClick}
              aria-label="Attach file"
              type="button"
              {disabled}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 7.5L10 2.5L5 7.5M15 12.5L10 17.5L5 12.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          {/if}

          <textarea
            class="chat-input__field"
            {placeholder}
            value={inputValue}
            oninput={handleInput}
            onkeydown={handleKeyDown}
            onfocus={() => isFocused = true}
            onblur={() => isFocused = false}
            {disabled}
            maxlength={maxLength}
            rows="1"
            aria-label="Message input"
          ></textarea>
          
          {#if maxLength && characterCount > maxLength * 0.8}
            <span class="chat-input__counter">
              {characterCount}{maxLength ? `/${maxLength}` : ''}
            </span>
          {/if}

          {#if showEmoji}
            <button
              class="chat-input__button chat-input__button--emoji"
              onclick={toggleEmojiPicker}
              aria-label="Add emoji"
              type="button"
              {disabled}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="2"/>
                <path d="M7 8C7.55228 8 8 7.55228 8 7C8 6.44772 7.55228 6 7 6C6.44772 6 6 6.44772 6 7C6 7.55228 6.44772 8 7 8Z" fill="currentColor"/>
                <path d="M13 8C13.5523 8 14 7.55228 14 7C14 6.44772 13.5523 6 13 6C12.4477 6 12 6.44772 12 7C12 7.55228 12.4477 8 13 8Z" fill="currentColor"/>
                <path d="M7 12C7 13.5 8.5 14.5 10 14.5C11.5 14.5 13 13.5 13 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          {/if}

          {#if showVoice}
            <button
              class="chat-input__button chat-input__button--voice"
              class:chat-input__button--recording={isRecording}
              onclick={handleVoiceClick}
              aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
              type="button"
              {disabled}
            >
              {#if isRecording}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="6" width="8" height="8" rx="2" fill="currentColor"/>
                </svg>
              {:else}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 3C8.89543 3 8 3.89543 8 5V9C8 10.1046 8.89543 11 10 11C11.1046 11 12 10.1046 12 9V5C12 3.89543 11.1046 3 10 3Z" stroke="currentColor" stroke-width="2"/>
                  <path d="M5 9C5 11.7614 7.23858 14 10 14C12.7614 14 15 11.7614 15 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M10 14V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              {/if}
            </button>
          {/if}

          {#if showSend && hasValue}
            <button
              class="chat-input__button chat-input__button--send"
              onclick={handleSend}
              aria-label="Send message"
              type="button"
              {disabled}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          {/if}
        </div>
      </div>
  {/if}

  {#if isTwoLine && formattingMenuOpen}
    <div class="chat-input__formatting-menu">
      <button class="chat-input__formatting-option" onclick={() => { inputValue += '**'; oninput?.(inputValue); }} type="button">
        <strong>B</strong>
      </button>
      <button class="chat-input__formatting-option" onclick={() => { inputValue += '*'; oninput?.(inputValue); }} type="button">
        <em>I</em>
      </button>
      <button class="chat-input__formatting-option" onclick={() => { inputValue += '`'; oninput?.(inputValue); }} type="button">
        <code>M</code>
      </button>
      <button class="chat-input__formatting-option" onclick={() => { inputValue += '~~'; oninput?.(inputValue); }} type="button">
        <s>S</s>
      </button>
    </div>
  {/if}

  {#if emojiPickerOpen}
    <div class="chat-input__emoji-picker">
      <div class="chat-input__emoji-grid">
        {#each commonEmojis as emoji}
          <button
            class="chat-input__emoji-item"
            onclick={() => insertEmoji(emoji)}
            type="button"
            aria-label="Insert {emoji}"
          >
            {emoji}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <input
    bind:this={fileInputRef}
    type="file"
    multiple
    class="chat-input__file-input"
    onchange={handleFileChange}
    aria-hidden="true"
    tabindex="-1"
  />
</div>

<style>
  .chat-input {
    position: relative;
    width: 100%;
  }

  .chat-input__container {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 24px;
    padding: 8px 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .chat-input--focused .chat-input__container {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15), 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .chat-input--compact .chat-input__container {
    padding: 6px 10px;
    border-radius: 20px;
  }

  .chat-input--two-line .chat-input__container {
    flex-direction: column;
    gap: 0;
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .chat-input__two-line-wrapper {
    width: 100%;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 16px;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .chat-input--two-line.chat-input--focused .chat-input__two-line-wrapper {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15), 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .chat-input__top-line {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .chat-input__bottom-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 12px;
  }

  .chat-input__bottom-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .chat-input__bottom-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }


  .chat-input__dropdown-wrapper {
    position: relative;
  }

  .chat-input__dropdown-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 20px;
    border: none;
    background: rgba(0, 0, 0, 0.05);
    color: #374151;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 13px;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    white-space: nowrap;
  }

  .chat-input__dropdown-button:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.08);
    transform: scale(1.02);
  }

  .chat-input__dropdown-button--compact {
    padding: 6px 8px;
    font-size: 12px;
  }

  .chat-input__dropdown-icon {
    font-size: 14px;
    line-height: 1;
  }

  .chat-input__dropdown-label {
    font-size: inherit;
  }

  .chat-input__dropdown-arrow {
    width: 12px;
    height: 12px;
    transition: transform 0.2s ease-out;
    flex-shrink: 0;
  }

  .chat-input__dropdown-wrapper:has(.chat-input__dropdown-button:focus) .chat-input__dropdown-arrow,
  .chat-input__dropdown-wrapper:has(.chat-input__dropdown:not([hidden])) .chat-input__dropdown-arrow {
    transform: rotate(180deg);
  }

  .chat-input__dropdown {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    padding: 6px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    min-width: 160px;
    max-width: 220px;
    animation: slide-up 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .chat-input__dropdown-option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease-out;
    text-align: left;
  }

  .chat-input__dropdown-option:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .chat-input__dropdown-option--active {
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
  }

  .chat-input__dropdown-option-icon {
    font-size: 16px;
    line-height: 1;
    flex-shrink: 0;
  }

  .chat-input__dropdown-option-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .chat-input__dropdown-option-label {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .chat-input__dropdown-option-desc {
    font-size: 12px;
    color: #6b7280;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .chat-input__dropdown-option--active .chat-input__dropdown-option-label {
    color: #2563eb;
  }

  .chat-input__action-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 20px;
    border: none;
    background: rgba(0, 0, 0, 0.05);
    color: #374151;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 13px;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    white-space: nowrap;
  }

  .chat-input__action-button:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.1);
    transform: scale(1.02);
  }

  .chat-input__action-button:active:not(:disabled) {
    transform: scale(0.98);
  }

  .chat-input__action-button--recording {
    background: #ef4444;
    color: #ffffff;
    animation: pulse-recording 1.5s ease-in-out infinite;
  }

  .chat-input__action-button-label {
    font-size: inherit;
    font-weight: inherit;
  }

  .chat-input__send-button-bottom {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  .chat-input__send-button-bottom:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    transform: scale(1.05);
  }

  .chat-input__send-button-bottom:active:not(:disabled) {
    transform: scale(0.95);
  }

  .chat-input__send-button-bottom--always {
    opacity: 0.6;
  }

  .chat-input__send-button-bottom--always:hover:not(:disabled) {
    opacity: 1;
  }

  .chat-input--two-line.chat-input--focused .chat-input__wrapper {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15), 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .chat-input__field--two-line {
    flex: 1;
    padding: 8px 0;
    min-height: 24px;
    max-height: 120px;
    border: none;
    background: transparent;
    resize: none;
    font-size: 15px;
    line-height: 1.5;
  }


  .chat-input__formatting-menu {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    padding: 4px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    display: flex;
    gap: 4px;
    animation: slide-up 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .chat-input__formatting-option {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    transition: all 0.15s ease-out;
    padding: 0;
  }

  .chat-input__formatting-option:hover {
    background: rgba(0, 0, 0, 0.1);
  }

  .chat-input__wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    min-height: 40px;
  }

  .chat-input__field {
    width: 100%;
    min-height: 24px;
    max-height: 120px;
    border: none;
    background: transparent;
    resize: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    font-size: 15px;
    line-height: 1.5;
    color: #111827;
    outline: none;
    padding: 8px 0;
    overflow-y: auto;
  }

  .chat-input__field::placeholder {
    color: #9ca3af;
  }

  .chat-input__counter {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 11px;
    color: #6b7280;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .chat-input__button {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #6b7280;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
  }

  .chat-input__button:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
    color: #374151;
    transform: scale(1.1);
  }

  .chat-input__button:active:not(:disabled) {
    transform: scale(0.95);
  }

  .chat-input__button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chat-input__button--send {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  .chat-input__button--send:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    transform: scale(1.05);
  }

  .chat-input__button--recording {
    background: #ef4444;
    color: #ffffff;
    animation: pulse-recording 1.5s ease-in-out infinite;
  }

  @keyframes pulse-recording {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
    }
  }

  .chat-input__emoji-picker {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 16px;
    padding: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
    animation: slide-up 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .chat-input__emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }

  .chat-input__emoji-item {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    transition: all 0.15s ease-out;
    padding: 0;
  }

  .chat-input__emoji-item:hover {
    background: rgba(0, 0, 0, 0.1);
    transform: scale(1.2);
  }

  .chat-input__file-input {
    display: none;
  }

  /* Dark mode support */
  :global(.dark) .chat-input__container,
  :global([data-theme="dark"]) .chat-input__container {
    background: rgba(31, 41, 55, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-input--focused .chat-input__container,
  :global([data-theme="dark"]) .chat-input--focused .chat-input__container {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(59, 130, 246, 0.4);
  }

  :global(.dark) .chat-input__two-line-wrapper,
  :global([data-theme="dark"]) .chat-input__two-line-wrapper {
    background: rgba(31, 41, 55, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-input--two-line.chat-input--focused .chat-input__two-line-wrapper,
  :global([data-theme="dark"]) .chat-input--two-line.chat-input--focused .chat-input__two-line-wrapper {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(59, 130, 246, 0.4);
  }

  :global(.dark) .chat-input__action-button,
  :global([data-theme="dark"]) .chat-input__action-button {
    background: rgba(255, 255, 255, 0.1);
    color: #d1d5db;
  }

  :global(.dark) .chat-input__action-button:hover:not(:disabled),
  :global([data-theme="dark"]) .chat-input__action-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    color: #f9fafb;
  }

  :global(.dark) .chat-input__action-button,
  :global([data-theme="dark"]) .chat-input__action-button {
    background: rgba(255, 255, 255, 0.1);
    color: #d1d5db;
  }

  :global(.dark) .chat-input__action-button:hover:not(:disabled),
  :global([data-theme="dark"]) .chat-input__action-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    color: #f9fafb;
  }

  :global(.dark) .chat-input__send-dropdown,
  :global([data-theme="dark"]) .chat-input__send-dropdown {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-input__send-option:hover,
  :global([data-theme="dark"]) .chat-input__send-option:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-input__send-option-label,
  :global([data-theme="dark"]) .chat-input__send-option-label {
    color: #f9fafb;
  }

  :global(.dark) .chat-input__formatting-menu,
  :global([data-theme="dark"]) .chat-input__formatting-menu {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-input__formatting-option,
  :global([data-theme="dark"]) .chat-input__formatting-option {
    color: #d1d5db;
  }

  :global(.dark) .chat-input__formatting-option:hover,
  :global([data-theme="dark"]) .chat-input__formatting-option:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-input__inline-button,
  :global([data-theme="dark"]) .chat-input__inline-button {
    color: #d1d5db;
  }

  :global(.dark) .chat-input__inline-button:hover:not(:disabled),
  :global([data-theme="dark"]) .chat-input__inline-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: #f9fafb;
  }

  :global(.dark) .chat-input__dropdown-button,
  :global([data-theme="dark"]) .chat-input__dropdown-button {
    background: rgba(255, 255, 255, 0.1);
    color: #d1d5db;
  }

  :global(.dark) .chat-input__dropdown-button:hover:not(:disabled),
  :global([data-theme="dark"]) .chat-input__dropdown-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    color: #f9fafb;
  }

  :global(.dark) .chat-input__dropdown,
  :global([data-theme="dark"]) .chat-input__dropdown {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-input__dropdown-option:hover,
  :global([data-theme="dark"]) .chat-input__dropdown-option:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-input__dropdown-option-label,
  :global([data-theme="dark"]) .chat-input__dropdown-option-label {
    color: #f9fafb;
  }

  :global(.dark) .chat-input__dropdown-option-desc,
  :global([data-theme="dark"]) .chat-input__dropdown-option-desc {
    color: #9ca3af;
  }

  :global(.dark) .chat-input__dropdown-option--active,
  :global([data-theme="dark"]) .chat-input__dropdown-option--active {
    background: rgba(59, 130, 246, 0.2);
  }

  :global(.dark) .chat-input__field,
  :global([data-theme="dark"]) .chat-input__field {
    color: #f9fafb;
  }

  :global(.dark) .chat-input__field::placeholder,
  :global([data-theme="dark"]) .chat-input__field::placeholder {
    color: #6b7280;
  }

  :global(.dark) .chat-input__button:hover:not(:disabled),
  :global([data-theme="dark"]) .chat-input__button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: #f9fafb;
  }

  :global(.dark) .chat-input__emoji-picker,
  :global([data-theme="dark"]) .chat-input__emoji-picker {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-input__emoji-item:hover,
  :global([data-theme="dark"]) .chat-input__emoji-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .chat-input__container {
      padding: 6px 8px;
    }

    .chat-input__button {
      width: 32px;
      height: 32px;
    }

    .chat-input__emoji-grid {
      grid-template-columns: repeat(6, 1fr);
    }
  }
</style>

