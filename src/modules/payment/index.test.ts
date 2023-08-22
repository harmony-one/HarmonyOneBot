import { BotPayments } from "./index";
import {describe, expect, it, beforeEach, jest} from '@jest/globals'
import config from "../../config";
import { OnMessageContext } from "../types";

jest.mock('web3', () => {
    return jest.fn().mockImplementation(() => {
      return {
        eth: {
          default: jest.fn(() => ({
            eth: {
              getBalance: jest.fn(),
            },
          })),
          accounts: {
            privateKeyToAccount: jest.fn().mockReturnValue({
              address: 'mockedAddress',
              privateKey: 'mockedPrivateKey'
            }),
          },
        },
        utils: {
          sha3: jest.fn().mockReturnValue('mockedHashValue')
        },
      };
    });
  });
jest.mock("axios");
jest.mock("../../database/services");

describe("BotPayments", () => {
  let botPayments: BotPayments;

  beforeEach(() => {
    botPayments = new BotPayments();
    (botPayments as any).logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;
  });

  describe("getUserAccount", () => {
    it("should return a valid account given a user ID", () => {
      const userId = 1234;
      const account = botPayments.getUserAccount(userId);
      expect(account).toBeDefined();
      expect(account?.address).toBeDefined();
    });
  });

  describe("getPriceInONE", () => {
    it("should return the correct amount in ONE for given USD cents", () => {
      (botPayments as any).ONERate = 0.02;
      const centsUsd = 200; // $2
      const amount = botPayments.getPriceInONE(centsUsd);
      expect(amount.toString()).toBe("100000000000000000000"); // $2 should be 100 ONE at this rate
    });
  });

  describe("isUserInWhitelist", () => {
    it("should return true if user ID is in the whitelist", () => {
      config.payment.whitelist = ["1234", "testuser"];
      const inList = botPayments.isUserInWhitelist("1234");
      expect(inList).toBe(true);
    });

    it("should return true if username is in the whitelist", () => {
      config.payment.whitelist = ["1234", "testuser"];
      const inList = botPayments.isUserInWhitelist("otherId", "testuser");
      expect(inList).toBe(true);
    });

    it("should return false if neither user ID nor username is in the whitelist", () => {
      config.payment.whitelist = ["1234", "testuser"];
      const inList = botPayments.isUserInWhitelist("5678", "otheruser");
      expect(inList).toBe(false);
    });
  });

  describe("isSupportedEvent", () => {
    it("should return true for supported events", () => {
      const ctx: OnMessageContext = {
        update: { message: { text: "/credits" } }
      } as any;
      const result = botPayments.isSupportedEvent(ctx);
      expect(result).toBe(true);
    });

    it("should return false for unsupported events", () => {
      const ctx: OnMessageContext = {
        update: { message: { text: "/random" } }
      } as any;
      const result = botPayments.isSupportedEvent(ctx);
      expect(result).toBe(false);
    });
  });
});
