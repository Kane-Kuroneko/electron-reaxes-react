export const CopyButton = reaxper((props:{
	cheatCode:string
}) => {
	
	return <Button
		type = "primary"
		onClick={() => {
			if(CopyToClipboard(props.cheatCode)){
				message.success(i18n('copied'));
			}else {
				message.error(i18n('copy failed'));
			}
		}}
	><I18n>Copy</I18n></Button>;
});


import { Button ,message} from 'antd';
import CopyToClipboard from 'copy-to-clipboard';

