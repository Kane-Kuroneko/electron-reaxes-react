import {
	useLocation ,
	useNavigate,
} from "react-router-dom";
import { useUpdateQuery } from "#renderer/WindowFrames/shared/hooks/useUpdateQuery";

export const User = reaxper( () => {
	const updateQuery = useUpdateQuery();
	return <div
		onClick={() => {
			updateQuery({
				settings:['general'],
			})
		}}
	>
		User
	</div>;
} );

