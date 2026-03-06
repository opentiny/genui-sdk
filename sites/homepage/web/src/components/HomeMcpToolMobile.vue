<script setup lang="ts">
import { ref } from 'vue';
import genuiAbility3 from '@/assets/genui_ability_3.webp';
import { TinyTag } from '@opentiny/vue';

const wrapperClass = ref('home-mcp-tool-mobile');
const abilityThreePartContent = {
  title: 'Create_repository',
  subtitle: 'Create a new GitHub repository in your account',
  parameters: [
    {
      label: 'name *required',
      description: 'Repository name',
      tagColor: 'green',
      tag: 'string',
    },
    {
      label: 'private',
      description: 'Whether repo should be private',
      tagColor: 'orange',
      tag: 'boolean',
    },
    {
      label: 'autoInit',
      description: 'Initialize with README',
      tagColor: 'orange',
      tag: 'boolean',
    },
    {
      label: 'description',
      description: 'Repository description',
      tagColor: 'green',
      tag: 'string',
    },
  ],
};
</script>

<template>
  <section :class="wrapperClass">
    <div :class="`${wrapperClass}-title genui-title`">
      <div>结合MCP工具</div>
      <div>让AI更懂业务场景</div>
    </div>
    <div :class="`${wrapperClass}-subtitle genui-subtitle`">接入MCP工具后，模型在调用工具缺少参数时能自动生成交互式UI来收集所需信息</div>
    <div :class="`${wrapperClass}-content`">
      <img :src="genuiAbility3" alt="genui-ability-3"/>
      <div :class="`${wrapperClass}-content-title`">{{ abilityThreePartContent.title }}</div>
      <div :class="`${wrapperClass}-content-subtitle`">{{ abilityThreePartContent.subtitle }}</div>
      <div :class="`${wrapperClass}-content-parameters`">
        <div :class="`${wrapperClass}-content-parameters-label`">Parameters</div>
        <div v-for="parameter in abilityThreePartContent.parameters" :key="parameter.label" :class="`${wrapperClass}-content-parameter`">
          <div :class="`${wrapperClass}-content-parameter-wrap`">
            <div :class="`${wrapperClass}-content-parameter-wrap-label`">{{ parameter.label }}</div>
            <tiny-tag :color="parameter.tagColor" size="small">{{ parameter.tag }}</tiny-tag>
          </div>
          <div :class="`${wrapperClass}-content-parameter-description`">{{ parameter.description }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>
.home-mcp-tool-mobile {
  width: 100%;
  padding: 46px 20px 20px 20px;
  background: rgba(248, 248, 255, 1);

  &-title {
    font-size: var(--font-size-title-md);
    line-height: var(--line-height-title-md);
  }

  &-subtitle {
    font-size: var(--font-size-body-md);
    white-space: normal;
    margin-bottom: 30px;
  }

  &-content {
    padding: 12px;
    padding-bottom: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0px 4px 4px 0px rgba(234, 236, 246, 0.25);

    img {
      border-radius: 6px;
      width: 100%;
      margin-bottom: 20px;
    }

    &-title {
      font-size: var(--font-size-title-sm);
      line-height: 27px;
      font-weight: 600;
    }

    &-subtitle {
      color: rgba(102, 102, 102, 1);
      font-size: 14px;
      font-weight: 400;
      line-height: 16px;
      margin-bottom: 16px;
    }

    &-parameters {
      display: flex;
      flex-direction: column;

      &-label {
        font-size: 18px;
        font-weight: 600;
        line-height: 24px;
        margin-bottom: 12px;
      }
    }

    &-parameter {
      display: flex;
      flex-direction: column;
      margin-bottom: 12px;

      &-wrap {
        display: flex;
        align-items: center;
        gap: 5px;

        &-label {
          font-size: 16px;
          font-weight: 500;
          line-height: 21px;
          margin-bottom: 4px;
        }
      }

      &-description {
        font-size: 14px;
        font-weight: 400;
        line-height: 20px;
        color: rgba(102, 102, 102, 1);
      }
    }
  }
}
</style>