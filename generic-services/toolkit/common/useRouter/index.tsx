export const useRouter = () => {
	return {
		navigate : useNavigate() ,
		params : useParams() ,
		location : useLocation() ,
	};
};
import {
	useLocation ,
	useNavigate ,
	useParams ,
} from 'react-router-dom';
