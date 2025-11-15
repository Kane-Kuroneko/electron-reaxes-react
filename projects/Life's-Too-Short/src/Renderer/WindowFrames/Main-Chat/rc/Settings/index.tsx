import { useUpdateQuery } from "#renderer/WindowFrames/shared/hooks/useUpdateQuery";

export const Settings = reaxper(() => {
	
	const navigate = useNavigate();
	const updateQuery = useUpdateQuery();
	
	return <Modal
		open
		centered
		onClose={() => {
			updateQuery({settings : null});
		}}
		onCancel={() => {
			updateQuery({settings : null});
		}}
	>
		<div>
			this is settings
		</div>
	</Modal>
})


import { Modal } from 'antd';
import { useNavigate ,  } from 'react-router-dom';
