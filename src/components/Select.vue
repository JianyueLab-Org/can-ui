<script setup lang="ts">
/**
 * A native `<select>`, deliberately.
 *
 * A custom listbox is the more fashionable answer and the wrong one for a
 * platform-feel system: the native control is the one the member's OS already
 * knows how to render — a wheel on a phone, a menu on a Mac — and it comes
 * with keyboard behaviour, type-ahead and screen-reader support that a
 * hand-built one spends a thousand lines approximating badly. Familiarity
 * beats a matching border radius.
 *
 * Use Segmented instead when there are two to four options and they should all
 * be visible at once.
 */
import { computed } from "vue";
import Icon from "./Icon.vue";

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    options: Option[];
    label?: string;
    name?: string;
    id?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    hint?: string;
    error?: string;
  }>(),
  { required: false, disabled: false },
);

defineEmits<{ (e: "update:modelValue", value: string): void }>();

const selectId = computed(() => props.id ?? props.name);
const describedBy = computed(() => {
  if (!selectId.value) return undefined;
  if (props.error) return `${selectId.value}-error`;
  if (props.hint) return `${selectId.value}-hint`;
  return undefined;
});
</script>

<template>
  <div>
    <label
      v-if="label"
      :for="selectId"
      class="block text-sm font-medium text-ink"
    >
      {{ label }}
      <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <div :class="['relative', label ? 'mt-1.5' : '']">
      <select
        :id="selectId"
        :name="name"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy"
        :class="[
          'input cursor-pointer appearance-none pr-9',
          error ? 'input-error' : '',
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ]"
        @change="
          $emit('update:modelValue', ($event.target as HTMLSelectElement).value)
        "
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </option>
      </select>
      <Icon
        name="chevronUpDown"
        class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint"
      />
    </div>
    <p
      v-if="error"
      :id="selectId ? `${selectId}-error` : undefined"
      class="mt-1.5 text-sm text-danger"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="selectId ? `${selectId}-hint` : undefined"
      class="mt-1.5 text-sm text-muted"
    >
      {{ hint }}
    </p>
  </div>
</template>
