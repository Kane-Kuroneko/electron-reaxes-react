export const ChannelWithContextMenu = reaxper(() => {
	
	
	return <>
		<span
			className={less.freeChatItem}
			onContextMenu={(e) => {
				e.preventDefault();
				setState({
					contextMenu :  {
						...store.contextMenu,
						position : { x: e.clientX, y: e.clientY },
						visible : true,
					}
				})
			}}
		>{props.label}</span>
		{ store.contextMenu.visible && <div
			style={ {
				position : 'fixed' ,
				top : store.contextMenu.position.y ,
				left : store.contextMenu.position.x ,
				zIndex : 9999 ,
			} }
		>
			<Menu
				items={ store.menu }
				onClick={(mi) => {
					mi.domEvent.stopPropagation();
					console.log(mi.keyPath);
				}}
			/>
		</div> }
	</>
})
