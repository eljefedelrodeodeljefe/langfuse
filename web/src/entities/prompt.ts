import { z } from "zod";
import { type Prompt, jsonSchema } from "@langfuse/shared";
import type { Modify } from './_base'


export const ChatMessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

export enum PromptTypes {
  Chat = "chat",
  Text = "text",
}

export type PromptType = keyof typeof PromptTypes;

export const PromptLabelSchema = z
  .string()
  .min(1)
  .max(20)
  .regex(
    /^[a-z0-9_\-.]+$/,
    "Label must be lowercase alphanumeric with optional underscores, hyphens, or periods",
  );

export const TextPromptSchema = z.object({
  id: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  projectId: z.string(),
  createdBy: z.string(),
  version: z.number(),
  name: z.string(),
  labels: z.array(PromptLabelSchema),
  tags: z.array(z.string()),
  type: z.literal(PromptTypes.Text),
  prompt: z.string(),
  config: jsonSchema,
});

export type TextPromptType =
  z.infer<typeof TextPromptSchema> extends Prompt
  ? z.infer<typeof TextPromptSchema>
  : never;

export const ChatPromptSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  projectId: z.string(),
  createdBy: z.string(),
  version: z.number(),
  name: z.string(),
  tags: z.array(z.string()),
  labels: z.array(PromptLabelSchema),
  type: z.literal(PromptTypes.Chat),
  prompt: z.array(ChatMessageSchema),
  config: jsonSchema,
});

export type ChatPromptType =
  z.infer<typeof ChatPromptSchema> extends Prompt
  ? z.infer<typeof ChatPromptSchema>
  : never;

export const PromptSchema = z.union([TextPromptSchema, ChatPromptSchema]);
// DO NOT USE: tnis schema is demo only
export const PromptSchemaVNone = z.intersection(PromptSchema, z.object({ version: z.literal(-1) }));
// TODO: show transform
export const PromptSchemaVEvenOlderAndCapitalized = PromptSchemaVNone
// .transform((data) => ({
//   ...data,
//   type: data.type.toUpperCase()
// }));


type BasePrompt = z.infer<typeof PromptSchema>;
// Not to break existing producers, we need to be somewhat permissive here
export type ILangfusePromptAttributes = Modify<BasePrompt, {
  prompt: BasePrompt['prompt'] | unknown
  config: BasePrompt['config'] | unknown
  type: BasePrompt['type'] | PromptTypes | string | undefined
}>
// DO NOT USE: tnis schema is demo only
export type ILangfusePromptVNoneAttributes = z.infer<typeof PromptSchemaVNone>;;
export type ILangfusePromptVEvenOlderAndCapitalized = z.infer<typeof PromptSchemaVEvenOlderAndCapitalized>;;


export class LangfusePrompt {
  attributes: Partial<ILangfusePromptAttributes> = {}

  static get schemas() {
    return {
      latest: PromptSchema,
      vNone: PromptSchema
    }
  }

  static get schema() {
    return LangfusePrompt.schemas.latest
  }

  /**
   * @throws
   */
  get to() {
    return {
      latest: {
        struct: (): ILangfusePromptAttributes => {
          return PromptSchema.parse(this.attributes)
        },
      },
      vNone: {
        struct: (): ILangfusePromptVNoneAttributes => {
          return PromptSchemaVNone.parse(this.attributes)
        }
      },
      vEvenOlder: {
        struct: (): ILangfusePromptVEvenOlderAndCapitalized => {
          return PromptSchemaVEvenOlderAndCapitalized.parse(this.attributes)
        }
      },
      vDeprecated: {
        struct: (): never => {
          throw new Error("Deprecated")
        }
      }
    }
  }

  static ofStruct(struct: Partial<ILangfusePromptAttributes>): LangfusePrompt {
    const res = new LangfusePrompt()

    res.attributes = { ...PromptSchema.parse(struct) }

    return res
  }
}



