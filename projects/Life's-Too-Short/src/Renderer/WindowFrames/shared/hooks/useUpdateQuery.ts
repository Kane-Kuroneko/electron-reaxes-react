export const useUpdateQuery = () => {
	const location = useLocation();
	const navigate = useNavigate();
	
	const updateQuery = (newParams: Record<string, string | number|string[]>) => {
		// 解析当前 query
		const searchParams = new URLSearchParams(location.search);
		
		// 更新 query
		Object.entries(newParams).forEach(([key, value]) => {
			if (value === undefined || value === null) {
				searchParams.delete(key);
				return;
			} else if(Array.isArray(value)) {
				var result = value.join(',');
			}else{
				var result = value.toString();
			}
			searchParams.set( key , result );
		});
		
		// 生成新的 URL
		const newSearch = searchParams.toString();
		navigate(`${location.pathname}?${newSearch}`, { replace: false });
	};
	
	return updateQuery;
};
import {
	useLocation ,
	useNavigate,
} from "react-router-dom";
