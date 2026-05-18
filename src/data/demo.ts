// Demo tree shown in the 3D scene before the user submits any input, and used
// as the "currentTree" fallback by AppShell so leaf-click handlers always have
// a tree to walk. 5 levels, 16 leaves — the same shape every system produces.

import type { TreeNode } from '../types/tree';

export const DEMO_TREE: TreeNode = {
  name: "root_a7f3c892",
  children: [
    {
      name: "lvl1_5b8e1a2f",
      children: [
        {
          name: "lvl2_e3c1a9f0",
          children: [
            {
              name: "lvl3_1a2b3c4d",
              children: [
                { name: "leaf_01abc123" },
                { name: "leaf_02def456" }
              ]
            },
            {
              name: "lvl3_2e3f4a5b",
              children: [
                { name: "leaf_03ghi789" },
                { name: "leaf_04jkl012" }
              ]
            }
          ]
        },
        {
          name: "lvl2_7b125f3c",
          children: [
            {
              name: "lvl3_3c4d5e6f",
              children: [
                { name: "leaf_05mno345" },
                { name: "leaf_06pqr678" }
              ]
            },
            {
              name: "lvl3_4f5a6b7c",
              children: [
                { name: "leaf_07stu901" },
                { name: "leaf_08vwx234" }
              ]
            }
          ]
        }
      ]
    },
    {
      name: "lvl1_9c2d4f1a",
      children: [
        {
          name: "lvl2_a4d1bb99",
          children: [
            {
              name: "lvl3_5d6e7f8a",
              children: [
                { name: "leaf_09yza567" },
                { name: "leaf_10bcd890" }
              ]
            },
            {
              name: "lvl3_6e7f8a9b",
              children: [
                { name: "leaf_11efg123" },
                { name: "leaf_12hij456" }
              ]
            }
          ]
        },
        {
          name: "lvl2_0c5423d1",
          children: [
            {
              name: "lvl3_7f8a9b0c",
              children: [
                { name: "leaf_13klm789" },
                { name: "leaf_14nop012" }
              ]
            },
            {
              name: "lvl3_8a9b0c1d",
              children: [
                { name: "leaf_15qrs345" },
                { name: "leaf_16tuv678" }
              ]
            }
          ]
        }
      ]
    }
  ]
};
