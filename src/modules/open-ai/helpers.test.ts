/* eslint-disable */
import { limitConversationContext } from './helpers'
import { describe, expect, test, it } from "@jest/globals";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";

describe('limitConversationContext', () => {
  it('waits for the promise to resolve', () => {

    let conversation: CreateChatCompletionRequestMessage[] = [
      { role: "assistant", content: "Welcome to the platform!" },
      { role: "user", content: "Your order has been confirmed." },
      { role: "assistant", content: "Please adhere to the community guidelines." },
    ];

    let limitedConversation = limitConversationContext(conversation, 42)

    expect(limitedConversation.length).toEqual(1)
  })

  it('shouldAttachPartOfAMessage', () => {
    let conversation: CreateChatCompletionRequestMessage[] = [
      { role: "assistant", content: "Welcome to the platform!"},
      { role: "user", content: "Your order has been confirmed."},
      { role: "assistant", content: "Please adhere to the community guidelines."},
    ];

    let limitedConversation = limitConversationContext(conversation, 52)

    expect(limitedConversation.length).toEqual(2)
    expect(limitedConversation[0].content).toEqual("confirmed.")
    expect(limitedConversation[1].content).toEqual("Please adhere to the community guidelines.")
  })

  it('shouldReturnAllMessages', () => {
    let conversation: CreateChatCompletionRequestMessage[] = [
      { role: "assistant", content: "Welcome to the platform!"},
    { role: "user", content: "Your order has been confirmed."},
    { role: "assistant", content: "Please adhere to the community guidelines."},
  ];

    let limitedConversation = limitConversationContext(conversation, 100)

    expect(limitedConversation.length).toEqual(3)
    expect(limitedConversation[0].content).toEqual("Welcome to the platform!")
    expect(limitedConversation[1].content).toEqual("Your order has been confirmed.")
    expect(limitedConversation[2].content).toEqual("Please adhere to the community guidelines.")
  })

  it('shouldFilterEmpty', () => {
    let emptyConversation: CreateChatCompletionRequestMessage[] = [];

    let limitedEmpty = limitConversationContext(emptyConversation, 100)

    expect(limitedEmpty.length).toEqual(0)
  })

  it('shouldFilterEmptyMessages', () => {
    let conversation: CreateChatCompletionRequestMessage[] = [
      { role: "assistant", content: ""},
    { role: "assistant", content: "Please adhere to the community guidelines."},
    { role: "assistant", content: ""},
    { role: "assistant", content: null},
  ];

    let cleanConversation = limitConversationContext(conversation, 100)

    expect(cleanConversation.length).toEqual(1)
    expect(cleanConversation[0].content).toEqual("Please adhere to the community guidelines.")
  })

  it('shouldPreserveOrderOfMessages', () => {
    let conversation: CreateChatCompletionRequestMessage[] = [
      { role: "assistant", content: "one"},
    { role: "assistant", content: "two"},
    { role: "assistant", content: "three"},
  ];

    let limitedc = limitConversationContext(conversation, 100)

    expect(limitedc[0].content).toEqual("one")
    expect(limitedc[1].content).toEqual("two")
    expect(limitedc[2].content).toEqual("three")
  })
})
