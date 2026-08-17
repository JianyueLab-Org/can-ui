<script setup lang="ts">
/**
 * Multi-line field. Same label/hint/error contract as Input, so the two can be
 * mixed in one form without the rows disagreeing about where the error goes.
 */
import { computed, useId } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    label?: string;
    placeholder?: string;
    name?: string;
    id?: string;
    rows?: number;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    error?: string;
    hint?: string;
    maxlength?: number;
    /** Show a live "n / max" counter. Needs `maxlength`. */
    counter?: boolean;
  }>(),
  {
    rows: 4,
    required: false,
    disabled: false,
    readonly: false,
    counter: false,
  },
);

defineEmits<{ (e: "update:modelValue", value: string): void }>();

/**
 * Fall back to a generated id rather than trusting the call site.
 *
 * This was `props.id ?? props.name`, which is `undefined` when neither is
 * passed — and then `<label for>` points at nothing, clicking the label does
 * not focus the control, and a screen reader has no name to announce. Every
 * call site that passes only `label` was in exactly that state, which is most
 * of them: can-exam's bank editor alone had fifteen.
 *
 * `useId()` (Vue 3.5+) is stable across the SSR render and hydration; a random
 * id would differ between the two and mismatch. Same reasoning as Toggle's.
 */
const generatedId = useId();
const fieldId = computed(() => props.id ?? props.name ?? generatedId);
const describedBy = computed(() => {
  if (!fieldId.value) return undefined;
  if (props.error) return `${fieldId.value}-error`;
  if (props.hint) return `${fieldId.value}-hint`;
  return undefined;
});
const used = computed(() => (props.modelValue ?? "").length);
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-3">
      <label
        v-if="label"
        :for="fieldId"
        class="block text-sm font-medium text-ink"
      >
        {{ label }}
        <span v-if="required" class="text-danger" aria-hidden="true">*</span>
      </label>
      <!-- tnum so the count does not jitter the label line as digits change. -->
      <span
        v-if="counter && maxlength"
        class="tnum text-xs text-faint"
        aria-hidden="true"
      >
        {{ used }} / {{ maxlength }}
      </span>
    </div>
    <textarea
      :id="fieldId"
      :name="name"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="maxlength"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="describedBy"
      :class="[
        'input resize-y',
        label ? 'mt-1.5' : '',
        error ? 'input-error' : '',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ]"
      @input="
        $emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
    ></textarea>
    <p
      v-if="error"
      :id="fieldId ? `${fieldId}-error` : undefined"
      class="mt-1.5 text-sm text-danger"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="fieldId ? `${fieldId}-hint` : undefined"
      class="mt-1.5 text-sm text-muted"
    >
      {{ hint }}
    </p>
  </div>
</template>
