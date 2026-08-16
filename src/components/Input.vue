<script setup lang="ts">
/**
 * Text field with its label, hint and error wired together.
 *
 * Validation is announced inline rather than on submit, which is the whole
 * reason `error` is a prop on the field and not a banner at the top of the
 * form: a member should learn a value is wrong while they are still looking
 * at it, not after they have committed and been bounced back.
 *
 * The `id` falls back to `name`, so `<label for>` stays wired even when the
 * caller supplies only one. Both controlled (v-model) and uncontrolled
 * (FormData via `name`) use are supported.
 */
import { computed, useSlots } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    type?: string;
    label?: string;
    placeholder?: string;
    name?: string;
    id?: string;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    autocomplete?: string;
    inputmode?:
      | "none"
      | "text"
      | "decimal"
      | "numeric"
      | "tel"
      | "search"
      | "email"
      | "url";
    error?: string;
    /** Helper text below the field; hidden while `error` is set. */
    hint?: string;
    minlength?: number;
    maxlength?: number;
  }>(),
  { type: "text", required: false, disabled: false, readonly: false },
);

defineEmits<{ (e: "update:modelValue", value: string): void }>();

const slots = useSlots();

const inputId = computed(() => props.id ?? props.name);
const hasLeading = computed(() => !!slots.leadingIcon);
const hasTrailing = computed(() => !!slots.trailingIcon);
const describedBy = computed(() => {
  if (!inputId.value) return undefined;
  if (props.error) return `${inputId.value}-error`;
  if (props.hint) return `${inputId.value}-hint`;
  return undefined;
});
</script>

<template>
  <div>
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-ink"
    >
      {{ label }}
      <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <div :class="['relative', label ? 'mt-1.5' : '']">
      <span
        v-if="hasLeading"
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-faint"
      >
        <slot name="leadingIcon" />
      </span>
      <input
        :id="inputId"
        :name="name"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :minlength="minlength"
        :maxlength="maxlength"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy"
        :class="[
          'input',
          hasLeading ? 'pl-10' : '',
          hasTrailing ? 'pr-10' : '',
          error ? 'input-error' : '',
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ]"
        @input="
          $emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
      />
      <span
        v-if="hasTrailing"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-faint"
      >
        <slot name="trailingIcon" />
      </span>
    </div>
    <p
      v-if="error"
      :id="inputId ? `${inputId}-error` : undefined"
      class="mt-1.5 text-sm text-danger"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="inputId ? `${inputId}-hint` : undefined"
      class="mt-1.5 text-sm text-muted"
    >
      {{ hint }}
    </p>
  </div>
</template>
