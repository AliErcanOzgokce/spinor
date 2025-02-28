export const ROUTER_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenA",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenB",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountADesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountBDesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountAMin",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountBMin",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "addLiquidity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountA",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountB",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenA",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenB",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountAMin",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountBMin",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "removeLiquidity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountA",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountB",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const PAIR_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "token0",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "token1",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      {
        "internalType": "uint112",
        "name": "_reserve0",
        "type": "uint112"
      },
      {
        "internalType": "uint112",
        "name": "_reserve1",
        "type": "uint112"
      },
      {
        "internalType": "uint32",
        "name": "_blockTimestampLast",
        "type": "uint32"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "mint",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "burn",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amount0",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount1",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const SPINOR_AGENT_ABI = [
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "start",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isActive",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_strategy",
        "type": "uint256"
      }
    ],
    "name": "setTradeStrategy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_riskLevel",
        "type": "uint256"
      }
    ],
    "name": "setRiskLevel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const SPINOR_HISTORY_ABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "actionType",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "tokenA",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "tokenB",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amountA",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amountB",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "txHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "status",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tradeStrategy",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "riskLevel",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "int256",
          "name": "pnl",
          "type": "int256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "apy",
          "type": "uint256"
        }
      ],
      "name": "TradeRecorded",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "getTradeCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "actionType",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "tokenA",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "tokenB",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amountA",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amountB",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "reason",
          "type": "string"
        },
        {
          "internalType": "bytes32",
          "name": "txHash",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "status",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "tradeStrategy",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "riskLevel",
          "type": "uint256"
        },
        {
          "internalType": "int256",
          "name": "pnl",
          "type": "int256"
        },
        {
          "internalType": "uint256",
          "name": "apy",
          "type": "uint256"
        }
      ],
      "name": "recordTradeHistory",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "tradeHistory",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "actionType",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "tokenA",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "tokenB",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amountA",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amountB",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "reason",
          "type": "string"
        },
        {
          "internalType": "bytes32",
          "name": "txHash",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "status",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "tradeStrategy",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "riskLevel",
          "type": "uint256"
        },
        {
          "internalType": "int256",
          "name": "pnl",
          "type": "int256"
        },
        {
          "internalType": "uint256",
          "name": "apy",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]; 

  export const FACTORY_ABI = [
    {
      "constant": true,
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenA",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "tokenB",
          "type": "address"
        }
      ],
      "name": "getPair",
      "outputs": [
        {
          "internalType": "address",
          "name": "pair",
          "type": "address"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ] as const;
  