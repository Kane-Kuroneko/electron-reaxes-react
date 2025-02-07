/**
 * 将wcvctrl.controller注入到wcv.webcontents.window里,让view知道自己的id
 */

export const injectWcvctrlTemplate = (controller:SporeController) => {
	return fuseRaw( { controller } , template );
}
//@ts-expect-error
import template from './template.raw.tsx';
import { fuseRaw } from '../../fuse-raw.tsx';
import type { SporeController } from '#main/refaxels/Spore';
