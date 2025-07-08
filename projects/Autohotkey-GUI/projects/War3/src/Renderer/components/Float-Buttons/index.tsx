const iconGapPX = 68;

export const FloatButtons = reaxper( () => {
	
	return <>
		{
			IconElements.map( ( { key , Icon , Tooltip , onClick } , index ) => {
				return <Tooltip
					key = { key }
					placement = "top"
				>
					<FloatButton
						onClick = { onClick }
						className = { less['rb-float-button'] }
						shape = "circle"
						icon = { <Icon /> }
						style = { { insetInlineEnd : `${ index * iconGapPX + 36 }px` , zIndex : 1000 } }
					/>
				</Tooltip>;
			} )
		}
		<FloatLog />
		<FloatResetAllConf />
	</>;
} );

const IconElements = [
	{
		key : 'github' ,
		Tooltip : reaxper( ( props: TooltipProps ) => {
			return <Tooltip
				{ ...props }
				title = { <Button.Group>
					<Button><I18n>View On Github</I18n></Button>
				</Button.Group> }
				color = { 'white' }
			
			>{ props.children }</Tooltip>;
		} ) ,
		onClick() {
			if(isBrowser){
				window.open('https://github.com/Kane-Kuroneko/War3-AHK-Reaxes.git');
			}else if(isElectron){
				IpcRendererSend( 'open-url' ).send( 'https://github.com/Kane-Kuroneko/War3-AHK-Reaxes.git' );
			}
			
		} ,
		Icon : reaxper( () => {
			return <GithubFilled />;
		} ) ,
	} ,
	{
		key : 'sponsor' ,
		Tooltip : reaxper( ( props: TooltipProps ) => {
			return <Tooltip
				{ ...props }
				title = { i18n( 'Donate to This Project' ) }
			>{ props.children }</Tooltip>;
		} ) ,
		onClick() {
			const reax_Sponsor = reaxel_Sponsor();
			reax_Sponsor.toggleVisible( true );
		} ,
		Icon : reaxper( () => {
			const I = SponsorLottieIcon || {
				"en-US" : HeartOutlined ,
				'ko-KR' : HeartOutlined ,
				'zh-CN' : RedEnvelopeOutlined ,
				'ja-JP' : HeartOutlined ,
				'zh-TW' : HeartOutlined ,
			}[reaxel_I18n.store.language];
			
			return <I />;
		} ) ,
	} ,
	{
		key : 'bug-report' ,
		Tooltip : reaxper( ( props: TooltipProps ) => {
			return <Popover
				{ ...props }
				content={<div style={{
					display : 'flex',
					flexFlow : 'column nowrap',
					userSelect : 'none',
					
				}}>
					<a href="">Github Issue</a>
					<a href="mailto:kane.kuroneko@gmail.com">E-Mail</a>
				</div>}
				title = { i18n( 'Report Bug' ) }
			>{ props.children }</Popover>;
		} ) ,
		onClick() {
		} ,
		Icon : BugOutlined ,
	} ,
];


const SponsorLottieIcon = reaxper( () => {
	const ref: LottieRef = useRef();
	
	const { sleep , mount , onComplete , toggleTo , unmount , animationData } = reaxel_Lottie_Love();
	
	useEffect( () => {
		mount( ref.current );
		// return unmount;
		console.log( logProxy( _.omit( reaxel_Lottie_Love.store , 'lottie' ) ) );
		
		const runLottie = () => {
			return toggleTo( 'play' ).
			then( () => {
				return toggleTo( 'revert' );
			} ).
			then( () => {
				return sleep( 10000 );
			} ).then(runLottie);
		}
		runLottie();
		return () => {
			unmount();
		};
	} , [] );
	
	return <Lottie
		loop = { false }
		autoplay = { false }
		animationData = { animationData }
		style = { { cursor : "pointer" , height : 60 , transform : "scale(1.8)" } }
		lottieRef = { ref }
		onClick = { () => {
		} }
		onComplete = { () => {
			onComplete();
		} }
	/>;
} );

const reaxel_Lottie_Love = Refaxel_Lottie<"play" | "reset" | "revert">( {
	schemes : [
		{ name : "play" as const , segments : [ 0 , 190 ] } ,
		{ name : "revert" as const , segments : [ 190 , 0 ] , speed : .5 } ,
		{ name : "reset" as const , segments : [ 0 , 1 ] } ,
	] as const ,
	defaultScheme : 'revert' ,
	animationData : heart ,
	speed : 1 ,
} );

import { env , isBrowser,isElectron } from '#renderer/ENV';
import { IpcRendererSend } from '#renderer/utils/useIPC';
import { logProxy } from '#generic/utils/src/logProxy.utility';
import { FloatResetAllConf } from './left/Reset-All-Conf';
import { FloatLog } from './Float-Log';
import { reaxel_Sponsor } from '#renderer/reaxels/hotkey-enhancer/sponsor';
import { reaxel_I18n } from '#renderer/reaxels/i18n';
import { GithubFilled , HeartOutlined , RedEnvelopeOutlined , BugOutlined} from '@ant-design/icons';
import { Button , FloatButton , Tooltip , TooltipProps , Popover } from 'antd';

import { Refaxel_Lottie } from '#generic/refaxels/lottie';
import Lottie , { LottieRef } from "lottie-react";
import * as heart from "./love.lottie.json";

import * as less from './style.module.less';
