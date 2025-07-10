const { run } = require("hardhat");

async function main() {
  console.log("🔍 开始验证合约到 Etherscan...");

  // 合约地址（从 sepolia.json 获取）
  const contracts = {
    MockUSDC: "0x3664cB1F94442d995f9Ae62062CB26f5A77F58CB",
    MockFund: "0x92053436b6D0758EcFb765C86a71b2dC4228DEa0",
    FundShareToken: "0xA7b9E425e9D2A5c9E484B45c15bc44F4b9fB2842",
    ChainlinkPriceOracle: "0x5FCD8EbE1B61e7037002cDc33dBCAA91c7AeD5c0",
    UniswapIntegration: "0x427f38fCA385A1C57e6b4995474457939CD03aAF",
    MockTokensFactory: "0xF789421d1ed0D65c65aa076CB119bfBc028f554D",
    WETH: "0xA07EA61f3401eD18d333D47C3bC860070df39205",
    WBTC: "0x29371fc64Fe735Df95940D83aD5E9a8053804709",
    LINK: "0xE9235b4915D8248526895994d93F6d4c06B0dABb",
    DAI: "0x4c094e79fca22E0ec335015d65E9B1DcED8EE7Cf"
  };

  try {
    // 验证 MockUSDC
    console.log("\n1️⃣ 验证 MockUSDC...");
    await run("verify:verify", {
      address: contracts.MockUSDC,
      constructorArguments: ["0x87156d3C8Ad7368855FF7E688f3ec70A1aB995d5"],
    });
    console.log("✅ MockUSDC 验证成功");

    // 验证 MockTokensFactory
    console.log("\n2️⃣ 验证 MockTokensFactory...");
    await run("verify:verify", {
      address: contracts.MockTokensFactory,
      constructorArguments: ["0x87156d3C8Ad7368855FF7E688f3ec70A1aB995d5"],
    });
    console.log("✅ MockTokensFactory 验证成功");

    // 验证 WETH
    console.log("\n3️⃣ 验证 WETH...");
    await run("verify:verify", {
      address: contracts.WETH,
      constructorArguments: ["0x87156d3C8Ad7368855FF7E688f3ec70A1aB995d5"],
    });
    console.log("✅ WETH 验证成功");

    // 验证 WBTC
    console.log("\n4️⃣ 验证 WBTC...");
    await run("verify:verify", {
      address: contracts.WBTC,
      constructorArguments: ["0x87156d3C8Ad7368855FF7E688f3ec70A1aB995d5"],
    });
    console.log("✅ WBTC 验证成功");

    // 验证 LINK
    console.log("\n5️⃣ 验证 LINK...");
    await run("verify:verify", {
      address: contracts.LINK,
      constructorArguments: ["0x87156d3C8Ad7368855FF7E688f3ec70A1aB995d5"],
    });
    console.log("✅ LINK 验证成功");

    // 验证 DAI
    console.log("\n6️⃣ 验证 DAI...");
    await run("verify:verify", {
      address: contracts.DAI,
      constructorArguments: ["0x87156d3C8Ad7368855FF7E688f3ec70A1aB995d5"],
    });
    console.log("✅ DAI 验证成功");

    // 验证 ChainlinkPriceOracle
    console.log("\n7️⃣ 验证 ChainlinkPriceOracle...");
    await run("verify:verify", {
      address: contracts.ChainlinkPriceOracle,
      constructorArguments: ["0x87156d3C8Ad7368855FF7E688f3ec70A1aB995d5"],
    });
    console.log("✅ ChainlinkPriceOracle 验证成功");

    // 验证 UniswapIntegration
    console.log("\n8️⃣ 验证 UniswapIntegration...");
    await run("verify:verify", {
      address: contracts.UniswapIntegration,
      constructorArguments: [contracts.ChainlinkPriceOracle],
    });
    console.log("✅ UniswapIntegration 验证成功");

    // 验证 FundShareToken
    console.log("\n9️⃣ 验证 FundShareToken...");
    await run("verify:verify", {
      address: contracts.FundShareToken,
      constructorArguments: ["MockFund Share Token", "MFC", contracts.MockFund],
    });
    console.log("✅ FundShareToken 验证成功");

    // 验证 MockFund
    console.log("\n🔟 验证 MockFund...");
    await run("verify:verify", {
      address: contracts.MockFund,
      constructorArguments: [
        "MockFund Share Token",
        "MFC",
        "0x87156d3C8Ad7368855FF7E688f3ec70A1aB995d5",
        100, // managementFeeRate
        contracts.ChainlinkPriceOracle,
        contracts.UniswapIntegration
      ],
    });
    console.log("✅ MockFund 验证成功");

    console.log("\n🎉 所有合约验证完成！");
    console.log("\n📋 验证结果汇总:");
    console.log("MockUSDC:", contracts.MockUSDC);
    console.log("MockFund:", contracts.MockFund);
    console.log("FundShareToken:", contracts.FundShareToken);
    console.log("ChainlinkPriceOracle:", contracts.ChainlinkPriceOracle);
    console.log("UniswapIntegration:", contracts.UniswapIntegration);
    console.log("MockTokensFactory:", contracts.MockTokensFactory);
    console.log("WETH:", contracts.WETH);
    console.log("WBTC:", contracts.WBTC);
    console.log("LINK:", contracts.LINK);
    console.log("DAI:", contracts.DAI);

  } catch (error) {
    console.error("❌ 验证过程中出错:", error.message);
    
    // 如果是已经验证过的错误，显示成功信息
    if (error.message.includes("Already Verified")) {
      console.log("✅ 合约已经验证过了");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 