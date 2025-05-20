export const DonorCarousel = reaxper(() => {
	
	
	return <div
		className = { style['donor-carousel'] }
	>
		<Swiper
			loop = { true }
			direction = { 'vertical' }
			pagination = { {
				clickable : true ,
			} }
			autoplay = { {
				delay : 500 ,
				disableOnInteraction : false ,
			} }
			modules = { [ Autoplay ] }
			className = "mySwiper"
			slidesPerView={2}
		>
			<span><I18n>Thanks</I18n></span>
			{ data.map(( [ name , amount ] , index ) => {
				const I18nContent:React.FunctionComponent<i18nContentsProps> = i18nContents[reaxel_I18n.store.language];
				return <SwiperSlide
					key = { name + index + amount }
				>
					<I18nContent
						name = { name }
						amount = { amount }
					/>
				</SwiperSlide>;
			}) }
		</Swiper>
	</div>;
});

type i18nContentsProps = {
	name: string,
	amount: string,
};
const i18nContents = {
	'en-US' : reaxper(( props: i18nContentsProps ) => {
		return <span>Thanks <b>{ props.name }</b> for donating <b>{ props.amount }</b></span>
	}) ,
	'zh-CN' : reaxper(( props: i18nContentsProps ) => `感谢 ${ props.name } 捐赠了 ${ props.amount }`) ,
};

const data = [
	['EVA', 'USD $1000'],
	['孙上天', 'CNY ¥1000'],
	['山本', 'JPY ¥2000'],
	['Liam', 'USD $250'],
	['Chloe', 'EUR €300'],
	['محمد', 'AED د.إ500'],
	['Анна', 'RUB ₽4000'],
	['Carlos', 'MXN $1200'],
	['Fatima', 'SAR ﷼600'],
	['Hans', 'EUR €150'],
	['Nguyen', 'VND ₫2000000'],
	['Aarav', 'INR ₹7500'],
	['Kim Minseo', 'KRW ₩300000'],
	['Émile', 'CAD $100'],
	['Isabella', 'BRL R$500'],
	['Thabo', 'ZAR R900'],
	['Aung', 'MMK K500000'],
	['Siti', 'MYR RM200'],
	['Tuan', 'VND ₫1500000'],
	['Yuki', 'JPY ¥3500'],
	['Alex', 'AUD $400'],
	['Marta', 'PLN zł1000'],
	['Noah', 'CHF Fr.300'],
	['Noura', 'QAR ﷼450'],
	['Leo', 'SGD $350'],
	['Mikhail', 'RUB ₽2500'],
	['Nana', 'GHS ₵100'],
	['Javier', 'CLP $80000'],
	['Zhang Wei', 'CNY ¥2000'],
	['Thomas', 'GBP £180'],
	['Sven', 'NOK kr1000'],
	['Aisha', 'KES KSh10000'],
	['Lucas', 'BRL R$800'],
	['Ibrahim', 'EGP ج.م1000'],
	['Marina', 'UAH ₴700'],
	['Peter', 'DKK kr700'],
	['Hassan', 'PKR ₨12000'],
	['Alice', 'NZD $280'],
	['Omar', 'LYD ل.د300'],
	['Vlad', 'RON lei500']
];

import { reaxel_I18n } from '#renderer/reaxels/i18n';
import * as style from './style.module.less';
import 'swiper/css/bundle';
import { Swiper , SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
