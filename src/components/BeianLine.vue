<script setup lang="ts">
/**
 * 中国大陆 ICP 备案号那一行。
 *
 * ## 为什么是一个组件，而不是各站自己写一行
 *
 * 九个站要显示同一串字符并链到同一个地方。抄九份的失败方式和页脚 GitHub 链接
 * 那次一模一样 —— 一个抄错的备案号不报错、不变红、不影响任何功能，它只是不合
 * 规，而且要等到有人来查才会知道。号本身在 `sites.ts` 的 `ICP_FILING`，这里只
 * 负责把它画出来。
 *
 * ## 不随语言变
 *
 * 备案号是站点的法定标识，不是内容：英文页面上它也还是那一串。所以这个组件不
 * 收 `locale`，也没有可翻译的文案 —— 一旦有了标签，就会有人把它译成四种语言，
 * 而那四种译法里没有一种是规定认的。
 *
 * ## 外观
 *
 * 只用 `text-faint`，和版权行同一档，比正文更退后一层：它必须在，但它不是给会
 * 员看的。`inline-block py-1` 是为了在手机上够得着 —— 和页脚其余链接一致。
 */
import { ICP_FILING } from "../sites";
</script>

<template>
  <a
    :href="ICP_FILING.href"
    target="_blank"
    rel="noopener noreferrer"
    class="inline-block py-1 text-sm text-faint transition-colors hover:text-can"
  >
    {{ ICP_FILING.number }}
  </a>
</template>
