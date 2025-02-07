declare const controller : SporeController;
//@ts-expect-error
window.SporeController = controller;

console.log(`注入成功,SporeID是${controller.spore_id}`);

import type { SporeController } from '#main/refaxels/Spore';
