<script lang="ts">
  interface AssistantDisclosureNoteProps {
    text?: string;
  }

  let {
    text = 'AI assistant is for experimental use only. Do not request it to provide medical advice. Please review our AI and medical disclosures for full details. AI can make mistakes.'
  }: AssistantDisclosureNoteProps = $props();
</script>

<section class="assistant-disclosure-note">
  <p>{text}</p>
</section>

<style>
  .assistant-disclosure-note {
    border: 1px solid #2b3139;
    border-radius: 10px;
    background: #171a1f;
    padding: 9px 10px;
  }

  .assistant-disclosure-note p {
    margin: 0;
    color: #8e96a3;
    font-size: 0.76rem;
    line-height: 1.45;
    font-weight: 400;
  }
</style>
