import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

interface IconProps extends SvgIconProps {
  width?: string | number;
  height?: string | number;
}

export const HomeMenuIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9.02 2.84004L3.63 7.04004C2.73 7.74004 2 9.23004 2 10.36V17.77C2 20.09 3.89 21.99 6.21 21.99H17.79C20.11 21.99 22 20.09 22 17.78V10.5C22 9.29004 21.19 7.74004 20.2 7.05004L14.02 2.72004C12.62 1.74004 10.37 1.79004 9.02 2.84004Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 17.99V14.99"/>
    </SvgIcon>
));

export const CalendarAddMenuIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M8 2V5"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M16 2V5"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M3.5 9.08997H20.5"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M18 23C20.2091 23 22 21.2091 22 19C22 16.7909 20.2091 15 18 15C15.7909 15 14 16.7909 14 19C14 21.2091 15.7909 23 18 23Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M19.49 19.0499H16.51"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M18 17.59V20.58"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M21 8.5V16.36C20.27 15.53 19.2 15 18 15C15.79 15 14 16.79 14 19C14 19.75 14.21 20.46 14.58 21.06C14.79 21.42 15.06 21.74 15.37 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M11.9955 13.7H12.0045"/>
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.29431 13.7H8.30329"/>
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.29431 16.7H8.30329"/>
    </SvgIcon>
));

export const CalendarIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M8 2V5"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M16 2V5"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M3.5 9.09009H20.5"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M11.9955 13.7H12.0045"/>
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.29431 13.7H8.30329"/>
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.29431 16.7H8.30329"/>
    </SvgIcon>
));

export const CalendarMenuIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" d="M8 2V5"/>
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" d="M16 2V5"/>
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" d="M3.5 9.09009H20.5"/>
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z"/>
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15.6947 13.7H15.7037" />
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15.6947 16.7H15.7037" />
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M11.9955 13.7H12.0045" />
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M11.9955 16.7H12.0045" />
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8.29431 13.7H8.30329" />
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8.29431 16.7H8.30329" />
    </SvgIcon>
));

export const CalendarDayIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="currentColor" d="m18.5,2h-.5v-.5c0-.829-.672-1.5-1.5-1.5s-1.5.671-1.5,1.5v.5h-6v-.5c0-.829-.672-1.5-1.5-1.5s-1.5.671-1.5,1.5v.5h-.5C2.468,2,0,4.467,0,7.5v11c0,3.033,2.468,5.5,5.5,5.5h13c3.032,0,5.5-2.467,5.5-5.5V7.5c0-3.033-2.468-5.5-5.5-5.5Zm0,19H5.5c-1.379,0-2.5-1.122-2.5-2.5v-9.5h18v9.5c0,1.378-1.121,2.5-2.5,2.5Zm-8.5-8.5v2c0,.828-.672,1.5-1.5,1.5h-2c-.828,0-1.5-.672-1.5-1.5v-2c0-.828.672-1.5,1.5-1.5h2c.828,0,1.5.672,1.5,1.5Z"/>
    </SvgIcon>
));

export const ListMenuIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M22 10V15C22 20 20 22 15 22H9C4 22 2 20 2 15V9C2 4 4 2 9 2H14"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M22 10H18C15 10 14 9 14 6V2L22 10Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M7 13H13"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M7 17H11"/>
    </SvgIcon>
));

export const ListIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M22 10V15C22 20 20 22 15 22H9C4 22 2 20 2 15V9C2 4 4 2 9 2H14"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M22 10H18C15 10 14 9 14 6V2L22 10Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M7 13H13"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M7 17H11"/>
    </SvgIcon>
));

export const PersonListMenuIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M8 2V5"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M16 2V5"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M21 8.5V13.63C20.11 12.92 18.98 12.5 17.75 12.5C16.52 12.5 15.37 12.93 14.47 13.66C13.26 14.61 12.5 16.1 12.5 17.75C12.5 18.73 12.78 19.67 13.26 20.45C13.63 21.06 14.11 21.59 14.68 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M7 11H13"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M7 16H9.62"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M23 17.75C23 18.73 22.72 19.67 22.24 20.45C21.96 20.93 21.61 21.35 21.2 21.69C20.28 22.51 19.08 23 17.75 23C16.6 23 15.54 22.63 14.68 22C14.11 21.59 13.63 21.06 13.26 20.45C12.78 19.67 12.5 18.73 12.5 17.75C12.5 16.1 13.26 14.61 14.47 13.66C15.37 12.93 16.52 12.5 17.75 12.5C18.98 12.5 20.11 12.92 21 13.63C22.22 14.59 23 16.08 23 17.75Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M17.75 20.25C17.75 18.87 18.87 17.75 20.25 17.75C18.87 17.75 17.75 16.63 17.75 15.25C17.75 16.63 16.63 17.75 15.25 17.75C16.63 17.75 17.75 18.87 17.75 20.25Z" />
    </SvgIcon>
));

export const PersonMenuIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12.12 12.78C12.05 12.77 11.96 12.77 11.88 12.78C10.12 12.72 8.71997 11.28 8.71997 9.50998C8.71997 7.69998 10.18 6.22998 12 6.22998C13.81 6.22998 15.28 7.69998 15.28 9.50998C15.27 11.28 13.88 12.72 12.12 12.78Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M18.74 19.3801C16.96 21.0101 14.6 22.0001 12 22.0001C9.40001 22.0001 7.04001 21.0101 5.26001 19.3801C5.36001 18.4401 5.96001 17.5201 7.03001 16.8001C9.77001 14.9801 14.25 14.9801 16.97 16.8001C18.04 17.5201 18.64 18.4401 18.74 19.3801Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/>
    </SvgIcon>
));

export const PeopleMenuIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M9.16 10.87C9.06 10.86 8.94 10.86 8.83 10.87C6.45 10.79 4.56 8.84 4.56 6.44C4.56 3.99 6.54 2 9 2C11.45 2 13.44 3.99 13.44 6.44C13.43 8.84 11.54 10.79 9.16 10.87Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M16.41 4C18.35 4 19.91 5.57 19.91 7.5C19.91 9.39 18.41 10.93 16.54 11C16.46 10.99 16.37 10.99 16.28 11"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M4.16 14.56C1.74 16.18 1.74 18.82 4.16 20.43C6.91 22.27 11.42 22.27 14.17 20.43C16.59 18.81 16.59 16.17 14.17 14.56C11.43 12.73 6.92 12.73 4.16 14.56Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M18.34 20C19.06 19.85 19.74 19.56 20.3 19.13C21.86 17.96 21.86 16.03 20.3 14.86C19.75 14.44 19.08 14.16 18.37 14"/>
    </SvgIcon>
));

export const PeopleIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M9.16 10.87C9.06 10.86 8.94 10.86 8.83 10.87C6.45 10.79 4.56 8.84 4.56 6.44C4.56 3.99 6.54 2 9 2C11.45 2 13.44 3.99 13.44 6.44C13.43 8.84 11.54 10.79 9.16 10.87Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M16.41 4C18.35 4 19.91 5.57 19.91 7.5C19.91 9.39 18.41 10.93 16.54 11C16.46 10.99 16.37 10.99 16.28 11"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M4.16 14.56C1.74 16.18 1.74 18.82 4.16 20.43C6.91 22.27 11.42 22.27 14.17 20.43C16.59 18.81 16.59 16.17 14.17 14.56C11.43 12.73 6.92 12.73 4.16 14.56Z"/>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M18.34 20C19.06 19.85 19.74 19.56 20.3 19.13C21.86 17.96 21.86 16.03 20.3 14.86C19.75 14.44 19.08 14.16 18.37 14"/>
    </SvgIcon>
));

export const RoundViewColumnIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m15 20h-10a5.006 5.006 0 0 1 -5-5v-10a5.006 5.006 0 0 1 5-5h10a5.006 5.006 0 0 1 5 5v10a5.006 5.006 0 0 1 -5 5zm-10-18a3 3 0 0 0 -3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-10a3 3 0 0 0 -3-3zm19 17v-13a1 1 0 0 0 -2 0v13a3 3 0 0 1 -3 3h-13a1 1 0 0 0 0 2h13a5.006 5.006 0 0 0 5-5z"/>
    </SvgIcon>
));

export const UserIconSquareCircleV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m12 1c-7.71 0-11 3.29-11 11s3.29 11 11 11 11-3.29 11-11-3.29-11-11-11zm-4.293 19.475c.377-1.544 1.37-2.475 4.293-2.475s3.917.931 4.293 2.475c-1.176.357-2.594.525-4.293.525s-3.117-.168-4.293-.525zm10.413-.845c-1.012-3.217-3.916-3.631-6.119-3.631s-5.107.413-6.119 3.631c-2.028-1.35-2.881-3.774-2.881-7.631-.001-6.56 2.438-8.999 8.999-8.999s9 2.439 9 9c0 3.857-.853 6.281-2.881 7.631zm-6.12-13.63c-2.691 0-4 1.309-4 4s1.309 4 4 4 4-1.309 4-4-1.309-4-4-4zm0 6c-1.589 0-2-.411-2-2s.411-2 2-2 2 .411 2 2-.411 2-2 2z"/>
    </SvgIcon>
));

export const CirclePhoneFlipIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" stroke="currentColor" d="m1 12c0 9.75 5.879 11 11 11 7.71 0 11-3.29 11-11 0-9.75-5.878-11-11-11-7.71 0-11 3.29-11 11zm1 0c0-7.103 2.897-10 10-10s10 2.897 10 10-2.897 10-10 10-10-2.897-10-10z"/>
        <path fill="currentColor" stroke="currentColor" d="m6.164 14.162c-.295.904-.053 1.88.632 2.552.152.17 1.361 1.47 3.292 1.128 1.846-.326 3.842-1.641 5.012-2.756 1.141-1.169 2.44-3.151 2.799-4.97.371-1.997-1.101-3.239-1.164-3.291-.64-.653-1.629-.898-2.546-.605-.795.254-1.419.885-1.67 1.689-.287.921-.045 1.917.629 2.602l.112.113c-.176.503-.648 1.198-1.04 1.598-.398.38-1.105.85-1.614 1.022l-.119-.115c-.688-.666-1.696-.902-2.616-.621-.812.247-1.449.865-1.707 1.653zm.951.311c.156-.479.548-.855 1.047-1.007.579-.177 1.203-.03 1.631.383l.319.308c.113.109.276.159.425.134.846-.134 1.912-.904 2.386-1.357.47-.479 1.248-1.536 1.385-2.377.025-.158-.026-.318-.138-.432l-.311-.315c-.415-.42-.563-1.034-.386-1.601.153-.493.634-1.091 1.488-1.108.406-.008.801.162 1.099.463.08.07 1.116.963.855 2.366-.316 1.603-1.528 3.43-2.52 4.447-1.017.969-2.865 2.169-4.492 2.484-1.438.261-2.386-.838-2.397-.85-.419-.404-.569-.994-.392-1.537z"/>
    </SvgIcon>
));

export const CheckCircleIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m12,0C5.383,0,0,5.383,0,12s5.383,12,12,12,12-5.383,12-12S18.617,0,12,0Zm-.091,15.419c-.387.387-.896.58-1.407.58s-1.025-.195-1.416-.585l-2.782-2.696,1.393-1.437,2.793,2.707,5.809-5.701,1.404,1.425-5.793,5.707Z"/>
    </SvgIcon>
));

export const CheckSquareCircleIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m17.305 9.539c-1.312 2.053-3.18 4.626-6.001 6.319-.324.195-.731.19-1.05-.013-1.52-.963-2.661-1.995-3.594-3.248-.33-.443-.238-1.069.205-1.399.442-.33 1.069-.237 1.398.205.674.905 1.488 1.679 2.536 2.405 2.16-1.46 3.644-3.507 4.819-5.346.299-.466.917-.602 1.381-.304.466.298.602.916.305 1.381zm5.695 2.461c0 7.71-3.29 11-11 11s-11-3.29-11-11 3.29-11 11-11 11 3.29 11 11zm-2 0c0-6.561-2.439-9-9-9s-9 2.439-9 9 2.439 9 9 9 9-2.439 9-9z"/>
    </SvgIcon>
));

export const CheckSquareCircleFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path d="m12 1c-7.71 0-11 3.29-11 11s3.29 11 11 11 11-3.29 11-11-3.29-11-11-11zm5.305 8.539c-1.312 2.053-3.18 4.626-6.001 6.319-.324.195-.731.19-1.05-.013-1.52-.963-2.661-1.995-3.594-3.248-.33-.443-.238-1.069.205-1.399.442-.33 1.069-.237 1.398.205.674.905 1.488 1.679 2.536 2.405 2.16-1.46 3.644-3.507 4.819-5.346.299-.466.917-.602 1.381-.304.466.298.602.916.305 1.381z"/>
    </SvgIcon>
));

export const UndoAltIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M22.535,8.46A4.965,4.965,0,0,0,19,7h0L2.8,7,7.1,2.7A1,1,0,0,0,5.682,1.288L.732,6.237a2.5,2.5,0,0,0,0,3.535l4.95,4.951A1,1,0,1,0,7.1,13.309L2.788,9,19,9h0a3,3,0,0,1,3,3v7a3,3,0,0,1-3,3H5a1,1,0,0,0,0,2H19a5.006,5.006,0,0,0,5-5V12A4.969,4.969,0,0,0,22.535,8.46Z"/>
    </SvgIcon>
)); 

export const CloseIconCircleV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m15.707,9.707l-2.293,2.293,2.293,2.293c.391.391.391,1.023,0,1.414-.195.195-.451.293-.707.293s-.512-.098-.707-.293l-2.293-2.293-2.293,2.293c-.195.195-.451.293-.707.293s-.512-.098-.707-.293c-.391-.391-.391-1.023,0-1.414l2.293-2.293-2.293-2.293c-.391-.391-.391-1.023,0-1.414s1.023-.391,1.414,0l2.293,2.293,2.293-2.293c.391-.391,1.023-.391,1.414,0s.391,1.023,0,1.414Zm8.293,2.293c0,6.617-5.383,12-12,12S0,18.617,0,12,5.383,0,12,0s12,5.383,12,12Zm-2,0c0-5.514-4.486-10-10-10S2,6.486,2,12s4.486,10,10,10,10-4.486,10-10Z"/>
    </SvgIcon>
)); 

export const CloseIconFilledCircleV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m12,0C5.383,0,0,5.383,0,12s5.383,12,12,12,12-5.383,12-12S18.617,0,12,0Zm3.707,14.293c.391.391.391,1.023,0,1.414-.195.195-.451.293-.707.293s-.512-.098-.707-.293l-2.293-2.293-2.293,2.293c-.195.195-.451.293-.707.293s-.512-.098-.707-.293c-.391-.391-.391-1.023,0-1.414l2.293-2.293-2.293-2.293c-.391-.391-.391-1.023,0-1.414s1.023-.391,1.414,0l2.293,2.293,2.293-2.293c.391-.391,1.023-.391,1.414,0s.391,1.023,0,1.414l-2.293,2.293,2.293,2.293Z"/>
    </SvgIcon>
)); 

export const EditIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" {...props} sx={{ ...props.sx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9.1665 1.66675H7.49984C3.33317 1.66675 1.6665 3.33341 1.6665 7.50008V12.5001C1.6665 16.6667 3.33317 18.3334 7.49984 18.3334H12.4998C16.6665 18.3334 18.3332 16.6667 18.3332 12.5001V10.8334" />
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M13.3666 2.51663L6.7999 9.0833C6.5499 9.3333 6.2999 9.82497 6.2499 10.1833L5.89157 12.6916C5.75823 13.6 6.3999 14.2333 7.30823 14.1083L9.81657 13.75C10.1666 13.7 10.6582 13.45 10.9166 13.2L17.4832 6.6333C18.6166 5.49997 19.1499 4.1833 17.4832 2.51663C15.8166 0.849966 14.4999 1.3833 13.3666 2.51663Z" />
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M12.4248 3.45825C12.9831 5.44992 14.5415 7.00825 16.5415 7.57492" />
    </SvgIcon>
));

export const EditMenuIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9.1665 1.66675H7.49984C3.33317 1.66675 1.6665 3.33341 1.6665 7.50008V12.5001C1.6665 16.6667 3.33317 18.3334 7.49984 18.3334H12.4998C16.6665 18.3334 18.3332 16.6667 18.3332 12.5001V10.8334" />
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M13.3666 2.51663L6.7999 9.0833C6.5499 9.3333 6.2999 9.82497 6.2499 10.1833L5.89157 12.6916C5.75823 13.6 6.3999 14.2333 7.30823 14.1083L9.81657 13.75C10.1666 13.7 10.6582 13.45 10.9166 13.2L17.4832 6.6333C18.6166 5.49997 19.1499 4.1833 17.4832 2.51663C15.8166 0.849966 14.4999 1.3833 13.3666 2.51663Z" />
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" d="M12.4248 3.45825C12.9831 5.44992 14.5415 7.00825 16.5415 7.57492" />
    </SvgIcon>
));







export const TeamCheckV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m5.5,11c-1.93,0-3.5-1.57-3.5-3.5s1.57-3.5,3.5-3.5,3.5,1.57,3.5,3.5-1.57,3.5-3.5,3.5Zm12.5,1c-3.314,0-6,2.686-6,6s2.686,6,6,6,6-2.686,6-6-2.686-6-6-6Zm.619,8.414c-.378.378-.88.586-1.414.586h-.002c-.534,0-1.036-.209-1.413-.587l-2.012-2.012,1.414-1.414,2.013,2.013,3.615-3.615,1.414,1.414-3.615,3.615Zm-3.119-13.414c-1.93,0-3.5-1.57-3.5-3.5s1.57-3.5,3.5-3.5,3.5,1.57,3.5,3.5-1.57,3.5-3.5,3.5Zm-3.224,5.412c1.453-1.488,3.48-2.412,5.724-2.412,1.049,0,2.051.202,2.969.569-.21-1.451-1.461-2.569-2.969-2.569h-5c-1.463,0-2.684,1.053-2.947,2.441.925.418,1.7,1.11,2.223,1.971Zm-4.276-.412H3c-1.654,0-3,1.346-3,3v3h10c0-1.341.33-2.604.913-3.714-.321-1.31-1.505-2.286-2.913-2.286Z"/>
    </SvgIcon>
));

export const LocationThinIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M12,24c-1.517,0-2.913-.794-3.883-1.979C3.95,16.845,1.5,12.269,1.5,10,1.5,4.21,6.21,0,12,0s10.5,4.21,10.5,10c0,2.269-2.45,6.845-6.617,12.021-.97,1.185-2.366,1.979-3.883,1.979ZM12,1.5C7.038,1.5,3,5.038,3,10c0,2.095,2.327,6.352,6.383,11.178,.774,.923,1.802,1.321,2.617,1.321s1.842-.399,2.617-1.321c4.057-4.826,6.383-9.083,6.383-11.178,0-4.963-4.037-8.5-9-8.5Z"/>
        <path fill="currentColor" d="M12,14.5c-2.481,0-4.5-2.019-4.5-4.5s2.019-4.5,4.5-4.5,4.5,2.019,4.5,4.5-2.019,4.5-4.5,4.5Zm0-7.5c-1.654,0-3,1.346-3,3s1.346,3,3,3,3-1.346,3-3-1.346-3-3-3Z"/>
    </SvgIcon>
));

export const LocationThinMenuIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M12,24c-1.517,0-2.913-.794-3.883-1.979C3.95,16.845,1.5,12.269,1.5,10,1.5,4.21,6.21,0,12,0s10.5,4.21,10.5,10c0,2.269-2.45,6.845-6.617,12.021-.97,1.185-2.366,1.979-3.883,1.979ZM12,1.5C7.038,1.5,3,5.038,3,10c0,2.095,2.327,6.352,6.383,11.178,.774,.923,1.802,1.321,2.617,1.321s1.842-.399,2.617-1.321c4.057-4.826,6.383-9.083,6.383-11.178,0-4.963-4.037-8.5-9-8.5Z"/>
        <path fill="currentColor" d="M12,14.5c-2.481,0-4.5-2.019-4.5-4.5s2.019-4.5,4.5-4.5,4.5,2.019,4.5,4.5-2.019,4.5-4.5,4.5Zm0-7.5c-1.654,0-3,1.346-3,3s1.346,3,3,3,3-1.346,3-3-1.346-3-3-3Z"/>
    </SvgIcon>
));

export const LocationIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M12,6a4,4,0,1,0,4,4A4,4,0,0,0,12,6Zm0,6a2,2,0,1,1,2-2A2,2,0,0,1,12,12Z"/>
        <path fill="currentColor" d="M12,24a5.271,5.271,0,0,1-4.311-2.2c-3.811-5.257-5.744-9.209-5.744-11.747a10.055,10.055,0,0,1,20.11,0c0,2.538-1.933,6.49-5.744,11.747A5.271,5.271,0,0,1,12,24ZM12,2.181a7.883,7.883,0,0,0-7.874,7.874c0,2.01,1.893,5.727,5.329,10.466a3.145,3.145,0,0,0,5.09,0c3.436-4.739,5.329-8.456,5.329-10.466A7.883,7.883,0,0,0,12,2.181Z"/>
    </SvgIcon>
));

export const MemoCheckMenuIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m10,23c0,.553-.447,1-1,1h-4c-2.757,0-5-2.243-5-5V5C0,2.243,2.243,0,5,0h8c2.757,0,5,2.243,5,5v2c0,.553-.447,1-1,1s-1-.447-1-1v-2c0-1.654-1.346-3-3-3H5c-1.654,0-3,1.346-3,3v14c0,1.654,1.346,3,3,3h4c.553,0,1,.447,1,1ZM14,6c0-.553-.447-1-1-1H5c-.553,0-1,.447-1,1s.447,1,1,1h8c.553,0,1-.447,1-1Zm-4,5c0-.553-.447-1-1-1h-4c-.553,0-1,.447-1,1s.447,1,1,1h4c.553,0,1-.447,1-1Zm-5,4c-.553,0-1,.447-1,1s.447,1,1,1h2c.553,0,1-.447,1-1s-.447-1-1-1h-2Zm19,2c0,3.859-3.141,7-7,7s-7-3.141-7-7,3.141-7,7-7,7,3.141,7,7Zm-2,0c0-2.757-2.243-5-5-5s-5,2.243-5,5,2.243,5,5,5,5-2.243,5-5Zm-3.192-1.241l-2.223,2.134c-.144.141-.379.144-.522.002l-1.131-1.108c-.396-.388-1.028-.382-1.414.014-.387.395-.381,1.027.014,1.414l1.132,1.109c.46.449,1.062.674,1.663.674s1.201-.225,1.653-.671l2.213-2.124c.398-.383.411-1.016.029-1.414-.383-.4-1.017-.411-1.414-.029Z"/>
    </SvgIcon>
));

export const MailIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" {...props}>
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" d="M14.1665 17.0834H5.83317C3.33317 17.0834 1.6665 15.8334 1.6665 12.9167V7.08341C1.6665 4.16675 3.33317 2.91675 5.83317 2.91675H14.1665C16.6665 2.91675 18.3332 4.16675 18.3332 7.08341V12.9167C18.3332 15.8334 16.6665 17.0834 14.1665 17.0834Z" />
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" d="M14.1668 7.5L11.5585 9.58333C10.7002 10.2667 9.29183 10.2667 8.43349 9.58333L5.8335 7.5" />
    </SvgIcon>
));

export const PhoneIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" {...props}>
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" d="M18.3082 15.2751C18.3082 15.5751 18.2415 15.8834 18.0998 16.1834C17.9582 16.4834 17.7748 16.7667 17.5332 17.0334C17.1248 17.4834 16.6748 17.8084 16.1665 18.0167C15.6665 18.2251 15.1248 18.3334 14.5415 18.3334C13.6915 18.3334 12.7832 18.1334 11.8248 17.7251C10.8665 17.3167 9.90817 16.7667 8.95817 16.0751C7.99984 15.3751 7.0915 14.6001 6.22484 13.7417C5.3665 12.8751 4.5915 11.9667 3.89984 11.0167C3.2165 10.0667 2.6665 9.11675 2.2665 8.17508C1.8665 7.22508 1.6665 6.31675 1.6665 5.45008C1.6665 4.88341 1.7665 4.34175 1.9665 3.84175C2.1665 3.33341 2.48317 2.86675 2.92484 2.45008C3.45817 1.92508 4.0415 1.66675 4.65817 1.66675C4.8915 1.66675 5.12484 1.71675 5.33317 1.81675C5.54984 1.91675 5.7415 2.06675 5.8915 2.28341L7.82484 5.00842C7.97484 5.21675 8.08317 5.40841 8.15817 5.59175C8.23317 5.76675 8.27484 5.94175 8.27484 6.10008C8.27484 6.30008 8.2165 6.50008 8.09984 6.69175C7.9915 6.88341 7.83317 7.08341 7.63317 7.28341L6.99984 7.94175C6.90817 8.03341 6.8665 8.14175 6.8665 8.27508C6.8665 8.34175 6.87484 8.40008 6.8915 8.46675C6.9165 8.53341 6.9415 8.58341 6.95817 8.63341C7.10817 8.90841 7.3665 9.26675 7.73317 9.70008C8.10817 10.1334 8.50817 10.5751 8.9415 11.0167C9.3915 11.4584 9.82484 11.8667 10.2665 12.2417C10.6998 12.6084 11.0582 12.8584 11.3415 13.0084C11.3832 13.0251 11.4332 13.0501 11.4915 13.0751C11.5582 13.1001 11.6248 13.1084 11.6998 13.1084C11.8415 13.1084 11.9498 13.0584 12.0415 12.9667L12.6748 12.3417C12.8832 12.1334 13.0832 11.9751 13.2748 11.8751C13.4665 11.7584 13.6582 11.7001 13.8665 11.7001C14.0248 11.7001 14.1915 11.7334 14.3748 11.8084C14.5582 11.8834 14.7498 11.9917 14.9582 12.1334L17.7165 14.0917C17.9332 14.2417 18.0832 14.4167 18.1748 14.6251C18.2582 14.8334 18.3082 15.0417 18.3082 15.2751Z"/>
    </SvgIcon>
));

export const ContactCardIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" {...props}>
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M14.1665 17.5H5.83317C2.49984 17.5 1.6665 16.6667 1.6665 13.3333V6.66667C1.6665 3.33333 2.49984 2.5 5.83317 2.5H14.1665C17.4998 2.5 18.3332 3.33333 18.3332 6.66667V13.3333C18.3332 16.6667 17.4998 17.5 14.1665 17.5Z" />
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M11.6665 6.66675H15.8332" />
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12.5 10H15.8333" />
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M14.1665 13.3333H15.8332" />
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M7.08353 9.40827C7.91656 9.40827 8.59186 8.73296 8.59186 7.89993C8.59186 7.0669 7.91656 6.3916 7.08353 6.3916C6.2505 6.3916 5.5752 7.0669 5.5752 7.89993C5.5752 8.73296 6.2505 9.40827 7.08353 9.40827Z" />
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M9.99984 13.6082C9.88317 12.3999 8.92484 11.4499 7.7165 11.3416C7.29984 11.2999 6.87484 11.2999 6.44984 11.3416C5.2415 11.4582 4.28317 12.3999 4.1665 13.6082" />
    </SvgIcon>
));

export const WebsiteIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path d="m19.5,1H4.5C2.019,1,0,3.019,0,5.5v13c0,2.481,2.019,4.5,4.5,4.5h15c2.481,0,4.5-2.019,4.5-4.5V5.5c0-2.481-2.019-4.5-4.5-4.5Zm-15,1h15c1.93,0,3.5,1.57,3.5,3.5v2.5H1v-2.5c0-1.93,1.57-3.5,3.5-3.5Zm15,20H4.5c-1.93,0-3.5-1.57-3.5-3.5v-9.5h22v9.5c0,1.93-1.57,3.5-3.5,3.5ZM3,5c0-.552.448-1,1-1s1,.448,1,1-.448,1-1,1-1-.448-1-1Zm3,0c0-.552.448-1,1-1s1,.448,1,1-.448,1-1,1-1-.448-1-1Zm3,0c0-.552.448-1,1-1s1,.448,1,1-.448,1-1,1-1-.448-1-1Zm-.548,8.562l-.314,3.659c-.031.44-.337.779-.706.779-.244,0-.471-.151-.601-.4l-.831-1.6-.831,1.6c-.129.249-.356.4-.601.4-.368,0-.675-.339-.706-.779l-.314-3.659c-.026-.302.212-.562.515-.562.27,0,.494.207.516.477l.212,2.681.75-1.443c.193-.372.725-.372.918,0l.75,1.443.21-2.681c.021-.269.246-.477.516-.477h.002c.303,0,.541.26.515.562Zm12,0l-.314,3.659c-.031.44-.337.779-.706.779-.244,0-.471-.151-.601-.4l-.831-1.6-.831,1.6c-.129.249-.356.4-.601.4-.368,0-.675-.339-.706-.779l-.314-3.659c-.026-.302.212-.562.515-.562.27,0,.494.207.516.477l.212,2.681.75-1.443c.193-.372.725-.372.918,0l.75,1.443.21-2.681c.021-.269.246-.477.516-.477h.002c.303,0,.541.26.515.562Zm-6,0l-.314,3.659c-.031.44-.337.779-.706.779-.244,0-.471-.151-.601-.4l-.831-1.6-.831,1.6c-.129.249-.356.4-.601.4-.368,0-.675-.339-.706-.779l-.314-3.659c-.026-.302.212-.562.515-.562.27,0,.494.207.516.477l.212,2.681.75-1.443c.193-.372.725-.372.918,0l.75,1.443.21-2.681c.021-.269.246-.477.516-.477h.002c.303,0,.541.26.515.562Z"/>
    </SvgIcon>
));

export const AddPersonIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m20.5,17c0,.553-.447,1-1,1h-1.5v1.5c0,.553-.447,1-1,1s-1-.447-1-1v-1.5h-1.5c-.553,0-1-.447-1-1s.447-1,1-1h1.5v-1.5c0-.553.447-1,1-1s1,.447,1,1v1.5h1.5c.553,0,1,.447,1,1Zm3.5,0c0,3.859-3.141,7-7,7s-7-3.141-7-7,3.141-7,7-7,7,3.141,7,7Zm-2,0c0-2.757-2.243-5-5-5s-5,2.243-5,5,2.243,5,5,5,5-2.243,5-5ZM5,5c1.381,0,2.5-1.119,2.5-2.5S6.381,0,5,0s-2.5,1.119-2.5,2.5,1.119,2.5,2.5,2.5Zm3,11.463v6.537c0,.553-.447,1-1,1s-1-.447-1-1v-6h-2v6c0,.553-.447,1-1,1s-1-.447-1-1v-6.537c-1.195-.693-2-1.985-2-3.463v-3c0-2.206,1.794-4,4-4h2c2.206,0,4,1.794,4,4v3c0,1.478-.805,2.771-2,3.463Zm0-6.463c0-1.103-.897-2-2-2h-2c-1.103,0-2,.897-2,2v3c0,1.103.897,2,2,2h2c1.103,0,2-.897,2-2v-3Z"/>
    </SvgIcon>
));

export const AddPersonMenuIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m20.5,17c0,.553-.447,1-1,1h-1.5v1.5c0,.553-.447,1-1,1s-1-.447-1-1v-1.5h-1.5c-.553,0-1-.447-1-1s.447-1,1-1h1.5v-1.5c0-.553.447-1,1-1s1,.447,1,1v1.5h1.5c.553,0,1,.447,1,1Zm3.5,0c0,3.859-3.141,7-7,7s-7-3.141-7-7,3.141-7,7-7,7,3.141,7,7Zm-2,0c0-2.757-2.243-5-5-5s-5,2.243-5,5,2.243,5,5,5,5-2.243,5-5ZM5,5c1.381,0,2.5-1.119,2.5-2.5S6.381,0,5,0s-2.5,1.119-2.5,2.5,1.119,2.5,2.5,2.5Zm3,11.463v6.537c0,.553-.447,1-1,1s-1-.447-1-1v-6h-2v6c0,.553-.447,1-1,1s-1-.447-1-1v-6.537c-1.195-.693-2-1.985-2-3.463v-3c0-2.206,1.794-4,4-4h2c2.206,0,4,1.794,4,4v3c0,1.478-.805,2.771-2,3.463Zm0-6.463c0-1.103-.897-2-2-2h-2c-1.103,0-2,.897-2,2v3c0,1.103.897,2,2,2h2c1.103,0,2-.897,2-2v-3Z"/>
    </SvgIcon>
));

export const DoneIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" stroke="currentColor" strokeWidth="0.81" d="M19,0H5A5.006,5.006,0,0,0,0,5V19a5.006,5.006,0,0,0,5,5H19a5.006,5.006,0,0,0,5-5V5A5.006,5.006,0,0,0,19,0Zm3,19a3,3,0,0,1-3,3H5a3,3,0,0,1-3-3V5A3,3,0,0,1,5,2H19a3,3,0,0,1,3,3Z"/>
        <path fill="currentColor" stroke="currentColor" strokeWidth="0.81" d="M9.333,15.919,5.414,12A1,1,0,0,0,4,12H4a1,1,0,0,0,0,1.414l3.919,3.919a2,2,0,0,0,2.829,0L20,8.081a1,1,0,0,0,0-1.414h0a1,1,0,0,0-1.414,0Z"/>
    </SvgIcon>
));


export const LogoutIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path stroke="currentColor" fill="none" d="M9.40039 7.55999C9.71039 3.95999 11.5604 2.48999 15.6104 2.48999H15.7404C20.2104 2.48999 22.0004 4.27999 22.0004 8.74999V15.27C22.0004 19.74 20.2104 21.53 15.7404 21.53H15.6104C11.5904 21.53 9.74039 20.08 9.41039 16.54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path stroke="currentColor" fill="none" d="M15.4991 12H4.11914" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path stroke="currentColor" fill="none" d="M6.35 8.64999L3 12L6.35 15.35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </SvgIcon>
));

export const TrashIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M21,4H17.9A5.009,5.009,0,0,0,13,0H11A5.009,5.009,0,0,0,6.1,4H3A1,1,0,0,0,3,6H4V19a5.006,5.006,0,0,0,5,5h6a5.006,5.006,0,0,0,5-5V6h1a1,1,0,0,0,0-2ZM11,2h2a3.006,3.006,0,0,1,2.829,2H8.171A3.006,3.006,0,0,1,11,2Zm7,17a3,3,0,0,1-3,3H9a3,3,0,0,1-3-3V6H18Z"/>
        <path fill="currentColor" d="M10,18a1,1,0,0,0,1-1V11a1,1,0,0,0-2,0v6A1,1,0,0,0,10,18Z"/>
        <path fill="currentColor" d="M14,18a1,1,0,0,0,1-1V11a1,1,0,0,0-2,0v6A1,1,0,0,0,14,18Z"/>
    </SvgIcon>
));

export const SearchIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (  
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>    
        <path fill="currentColor" d="M22.705,21.253l-4.399-4.374c1.181-1.561,1.81-3.679,1.859-6.329-.105-6.095-3.507-9.473-9.588-9.513C4.423,1.076,1,4.649,1,10.549c0,6.195,3.426,9.512,9.589,9.548,2.629-.016,4.739-.626,6.303-1.805l4.403,4.379c.518,.492,1.131,.291,1.414-.004,.383-.398,.388-1.025-.004-1.414ZM3,10.567c.097-5.035,2.579-7.499,7.576-7.53,4.949,.032,7.503,2.571,7.589,7.512-.094,5.12-2.505,7.518-7.576,7.548-5.077-.03-7.489-2.422-7.589-7.53Z"/>
    </SvgIcon>
));

export const DownloadIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M23,24H1c-.55,0-1-.45-1-1s.45-1,1-1H23c.55,0,1,.45,1,1s-.45,1-1,1Zm-8.23-5.14s6.35-6.75,6.35-6.75c.87-.87,1.12-2.11,.65-3.24-.47-1.13-1.52-1.84-2.75-1.85h-2.07s-.03-3.05-.03-3.05c0-2.19-1.78-3.97-3.97-3.97h-1.98c-2.19,0-3.97,1.78-3.97,3.98v3.02s-2.05,0-2.05,0c-1.23,0-2.28,.71-2.75,1.85-.47,1.13-.22,2.38,.63,3.22l6.33,6.8c.77,.77,1.79,1.16,2.81,1.16s2.03-.39,2.81-1.16Zm-6.77-9.86c.27,0,.52-.11,.71-.29,.19-.19,.29-.44,.29-.71V3.97c0-1.09,.88-1.97,1.97-1.97h1.98c1.09,0,1.97,.89,1.97,1.98l.03,4.05c0,.55,.45,.99,1,.99h3.05c.61,0,.85,.47,.9,.61,.06,.14,.22,.64-.24,1.09l-6.33,6.73c-.77,.76-2.01,.75-2.75,.01l-6.33-6.8c-.43-.43-.27-.93-.21-1.07,.06-.14,.3-.61,.9-.61h3.06Z"/>
    </SvgIcon>
));

export const ImageIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M19.5,0H4.5A4.505,4.505,0,0,0,0,4.5v15A4.505,4.505,0,0,0,4.5,24h15A4.505,4.505,0,0,0,24,19.5V4.5A4.505,4.505,0,0,0,19.5,0ZM4.5,3h15A1.5,1.5,0,0,1,21,4.5v15a1.492,1.492,0,0,1-.44,1.06l-8.732-8.732a4,4,0,0,0-5.656,0L3,15V4.5A1.5,1.5,0,0,1,4.5,3Z"/>
        <circle fill="currentColor" cx="15.5" cy="7.5" r="2.5"/>
    </SvgIcon>
));

export const PDFIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M7.98,16.11c0,.47-.41,.86-.89,.86h-.83s0-1.72,0-1.72h.84c.48,0,.89,.39,.89,.86Zm7.02-8.11h6.54c-.35-.91-.88-1.75-1.59-2.46l-3.48-3.49c-.71-.71-1.55-1.24-2.46-1.59V7c0,.55,.45,1,1,1Zm-2.91,7.25h-.84v3.5s.84,0,.84,0c.48,0,.89-.39,.89-.86v-1.78c0-.47-.41-.86-.89-.86Zm9.91-4.76v8.51c0,2.76-2.24,5-5,5H7c-2.76,0-5-2.24-5-5V5C2,2.24,4.24,0,7,0h4.51c.16,0,.32,.01,.49,.02V7c0,1.65,1.35,3,3,3h6.98c.01,.16,.02,.32,.02,.49Zm-12.77,5.62c0-1.16-.96-2.11-2.14-2.11h-1.09c-.55,0-1,.45-1,1v4.44c0,.35,.28,.62,.62,.62s.62-.28,.62-.62v-1.22h.84c1.18,0,2.14-.95,2.14-2.11Zm5,0c0-1.16-.96-2.11-2.14-2.11h-1.09c-.55,0-1,.45-1,1v4.44c0,.35,.28,.56,.62,.56s1.46,0,1.46,0c1.18,0,2.14-.95,2.14-2.11v-1.78Zm4.79-1.48c0-.35-.28-.62-.62-.62h-2.31c-.35,0-.62,.28-.62,.62v4.81c0,.35,.28,.62,.62,.62s.62-.28,.62-.62v-1.8h1.24c.35,0,.62-.28,.62-.62s-.28-.62-.62-.62h-1.24v-1.14h1.69c.35,0,.62-.28,.62-.62Z"/>
    </SvgIcon>
));

export const TextFileIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m14 7v-6.54a6.977 6.977 0 0 1 2.465 1.59l3.484 3.486a6.954 6.954 0 0 1 1.591 2.464h-6.54a1 1 0 0 1 -1-1zm8 3.485v8.515a5.006 5.006 0 0 1 -5 5h-10a5.006 5.006 0 0 1 -5-5v-14a5.006 5.006 0 0 1 5-5h4.515c.163 0 .324.013.485.024v6.976a3 3 0 0 0 3 3h6.976c.011.161.024.322.024.485zm-8 8.515a1 1 0 0 0 -1-1h-5a1 1 0 0 0 0 2h5a1 1 0 0 0 1-1zm3-4a1 1 0 0 0 -1-1h-8a1 1 0 0 0 0 2h8a1 1 0 0 0 1-1z"/>
    </SvgIcon>
));

export const GenericFileIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M19.949,5.536,16.465,2.05A6.958,6.958,0,0,0,11.515,0H7A5.006,5.006,0,0,0,2,5V19a5.006,5.006,0,0,0,5,5H17a5.006,5.006,0,0,0,5-5V10.485A6.951,6.951,0,0,0,19.949,5.536ZM18.535,6.95A4.983,4.983,0,0,1,19.316,8H15a1,1,0,0,1-1-1V2.684a5.01,5.01,0,0,1,1.051.78ZM20,19a3,3,0,0,1-3,3H7a3,3,0,0,1-3-3V5A3,3,0,0,1,7,2h4.515c.164,0,.323.032.485.047V7a3,3,0,0,0,3,3h4.953c.015.162.047.32.047.485Z"/>
    </SvgIcon>
));

export const PencilIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M22.987,5.451c-.028-.177-.312-1.767-1.464-2.928-1.157-1.132-2.753-1.412-2.931-1.44-.237-.039-.479,.011-.682,.137-.118,.073-2.954,1.849-8.712,7.566C3.135,14.807,1.545,17.213,1.48,17.312c-.091,.14-.146,.301-.159,.467l-.319,4.071c-.022,.292,.083,.578,.29,.785,.188,.188,.443,.293,.708,.293,.025,0,.051,0,.077-.003l4.101-.316c.165-.013,.324-.066,.463-.155,.1-.064,2.523-1.643,8.585-7.662,5.759-5.718,7.548-8.535,7.622-8.652,.128-.205,.178-.45,.14-.689Zm-9.17,7.922c-4.93,4.895-7.394,6.78-8.064,7.263l-2.665,.206,.206-2.632c.492-.672,2.393-3.119,7.312-8.004,1.523-1.512,2.836-2.741,3.942-3.729,.01,.002,.02,.004,.031,.006,.012,.002,1.237,.214,2.021,.98,.772,.755,.989,1.93,.995,1.959,0,.004,.002,.007,.002,.011-.999,1.103-2.245,2.416-3.78,3.94Zm5.309-5.684c-.239-.534-.597-1.138-1.127-1.656-.524-.513-1.134-.861-1.674-1.093,1.139-.95,1.908-1.516,2.309-1.797,.419,.124,1.049,.377,1.481,.8,.453,.456,.695,1.081,.81,1.469-.285,.4-.851,1.159-1.798,2.278Z"/>
    </SvgIcon>
));

export const AddressBookIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M17.5,0h-9A5.5,5.5,0,0,0,3.607,3H2.5a1.5,1.5,0,0,0,0,3H3V8H2.5a1.5,1.5,0,0,0,0,3H3v2H2.5a1.5,1.5,0,0,0,0,3H3v2H2.5a1.5,1.5,0,0,0,0,3H3.607A5.5,5.5,0,0,0,8.5,24h9A5.506,5.506,0,0,0,23,18.5V5.5A5.506,5.506,0,0,0,17.5,0ZM20,18.5A2.5,2.5,0,0,1,17.5,21h-9A2.5,2.5,0,0,1,6,18.5V5.5A2.5,2.5,0,0,1,8.5,3h9A2.5,2.5,0,0,1,20,5.5Zm-9.5-9a2.5,2.5,0,0,1,5,0A2.5,2.5,0,0,1,10.5,9.5Zm6.488,6.732a.665.665,0,0,1-.673.768H9.654a.665.665,0,0,1-.673-.768C9.842,11.965,16.128,11.968,16.988,16.232Z"/>
    </SvgIcon>
));

export const UserIcon1V2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m12 1c-7.71 0-11 3.29-11 11s3.29 11 11 11 11-3.29 11-11-3.29-11-11-11zm-4.293 19.475c.377-1.544 1.37-2.475 4.293-2.475s3.917.931 4.293 2.475c-1.176.357-2.594.525-4.293.525s-3.117-.168-4.293-.525zm10.413-.845c-1.012-3.217-3.916-3.631-6.119-3.631s-5.107.413-6.119 3.631c-2.028-1.35-2.881-3.774-2.881-7.631-.001-6.56 2.438-8.999 8.999-8.999s9 2.439 9 9c0 3.857-.853 6.281-2.881 7.631zm-6.12-13.63c-2.691 0-4 1.309-4 4s1.309 4 4 4 4-1.309 4-4-1.309-4-4-4zm0 6c-1.589 0-2-.411-2-2s.411-2 2-2 2 .411 2 2-.411 2-2 2z"/>
    </SvgIcon>
));

export const TagsIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M7.707,9.256c.391,.391,.391,1.024,0,1.414-.391,.391-1.024,.391-1.414,0-.391-.391-.391-1.024,0-1.414,.391-.391,1.024-.391,1.414,0Zm13.852,6.085l-.565,.565c-.027,1.233-.505,2.457-1.435,3.399l-3.167,3.208c-.943,.955-2.201,1.483-3.543,1.487h-.017c-1.335,0-2.59-.52-3.534-1.464L1.882,15.183c-.65-.649-.964-1.542-.864-2.453l.765-6.916c.051-.456,.404-.819,.858-.881l6.889-.942c.932-.124,1.87,.193,2.528,.851l7.475,7.412c.387,.387,.697,.823,.931,1.288,.812-1.166,.698-2.795-.342-3.835L12.531,2.302c-.229-.229-.545-.335-.851-.292l-6.889,.942c-.549,.074-1.052-.309-1.127-.855-.074-.547,.309-1.051,.855-1.126L11.409,.028c.921-.131,1.869,.191,2.528,.852l7.589,7.405c1.946,1.945,1.957,5.107,.032,7.057Zm-3.438-1.67l-7.475-7.412c-.223-.223-.536-.326-.847-.287l-6.115,.837-.679,6.14c-.033,.303,.071,.601,.287,.816l7.416,7.353c.569,.57,1.322,.881,2.123,.881h.01c.806-.002,1.561-.319,2.126-.893l3.167-3.208c1.155-1.17,1.149-3.067-.014-4.229Z"/>
    </SvgIcon>
));

export const MemberListIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M9,12c3.309,0,6-2.691,6-6S12.309,0,9,0,3,2.691,3,6s2.691,6,6,6Zm0-11c2.757,0,5,2.243,5,5s-2.243,5-5,5-5-2.243-5-5S6.243,1,9,1Zm12.5,10h-6c-1.379,0-2.5,1.122-2.5,2.5v8c0,1.378,1.121,2.5,2.5,2.5h6c1.379,0,2.5-1.122,2.5-2.5V13.5c0-1.378-1.121-2.5-2.5-2.5Zm1.5,10.5c0,.827-.673,1.5-1.5,1.5h-6c-.827,0-1.5-.673-1.5-1.5V13.5c0-.827,.673-1.5,1.5-1.5h6c.827,0,1.5,.673,1.5,1.5v8Zm-2-7.003c0,.276-.224,.5-.5,.5h-4c-.276,0-.5-.224-.5-.5s.224-.5,.5-.5h4c.276,0,.5,.224,.5,.5Zm0,3.003c0,.276-.224,.5-.5,.5h-4c-.276,0-.5-.224-.5-.5s.224-.5,.5-.5h4c.276,0,.5,.224,.5,.5Zm0,2.997c0,.276-.224,.5-.5,.5h-4c-.276,0-.5-.224-.5-.5s.224-.5,.5-.5h4c.276,0,.5,.224,.5,.5Zm-10.008-5.778c-.049,.272-.311,.453-.579,.405-.465-.082-.94-.124-1.413-.124-4.411,0-8,3.589-8,8v.5c0,.276-.224,.5-.5,.5s-.5-.224-.5-.5v-.5c0-4.962,4.037-9,9-9,.531,0,1.065,.047,1.587,.14,.272,.048,.454,.308,.405,.58Z"/>
    </SvgIcon>
));
    
export const FileEditIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m4.5,1h5.515c.334,0,.663.03.985.088v5.412c0,1.378,1.122,2.5,2.5,2.5h5.411c.033.178.057.359.071.541.022.275.274.479.539.458.275-.022.48-.264.458-.539-.125-1.536-.793-2.981-1.883-4.07l-3.485-3.485c-1.228-1.228-2.86-1.904-4.596-1.904h-5.515C2.019,0,0,2.019,0,4.5v15c0,2.481,2.019,4.5,4.5,4.5h4c.276,0,.5-.224.5-.5s-.224-.5-.5-.5h-4c-1.93,0-3.5-1.57-3.5-3.5V4.5c0-1.93,1.57-3.5,3.5-3.5Zm12.889,5.096c.545.545.965,1.195,1.24,1.904h-5.129c-.827,0-1.5-.673-1.5-1.5V1.368c.706.273,1.353.692,1.904,1.243l3.485,3.485Zm5.878,5.636c-.943-.944-2.592-.944-3.535,0l-7.707,7.707c-.661.661-1.025,1.54-1.025,2.475v1.586c0,.276.224.5.5.5h1.586c.935,0,1.814-.364,2.475-1.025l7.707-7.707c.472-.472.732-1.1.732-1.768s-.26-1.296-.732-1.768Zm-.707,2.828l-7.707,7.707c-.472.472-1.1.732-1.768.732h-1.086v-1.086c0-.668.26-1.295.732-1.768l7.707-7.707c.566-.566,1.555-.566,2.121,0,.283.283.439.66.439,1.061s-.156.777-.439,1.061Z"/>
    </SvgIcon>
));

export const PlainDocumentIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M19,0H5C2.24,0,0,2.24,0,5v14c0,2.76,2.24,5,5,5h14c2.76,0,5-2.24,5-5V5c0-2.76-2.24-5-5-5Zm3,19c0,1.65-1.35,3-3,3H5c-1.65,0-3-1.35-3-3V5c0-1.65,1.35-3,3-3h14c1.65,0,3,1.35,3,3v14ZM5,10c0-.55,.45-1,1-1H15c.55,0,1,.45,1,1s-.45,1-1,1H6c-.55,0-1-.45-1-1Zm0-4c0-.55,.45-1,1-1h6c.55,0,1,.45,1,1s-.45,1-1,1H6c-.55,0-1-.45-1-1Zm14,8c0,.55-.45,1-1,1H6c-.55,0-1-.45-1-1s.45-1,1-1h12c.55,0,1,.45,1,1Zm-9,4c0,.55-.45,1-1,1h-3c-.55,0-1-.45-1-1s.45-1,1-1h3c.55,0,1,.45,1,1Z"/>
    </SvgIcon>
));

export const ClockCircleIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M12,24C5.383,24,0,18.617,0,12S5.383,0,12,0s12,5.383,12,12-5.383,12-12,12Zm0-22C6.486,2,2,6.486,2,12s4.486,10,10,10,10-4.486,10-10S17.514,2,12,2Zm5,10c0-.553-.447-1-1-1h-3V6c0-.553-.448-1-1-1s-1,.447-1,1v6c0,.553,.448,1,1,1h4c.553,0,1-.447,1-1Z"/>
    </SvgIcon>
));

export const ClockSquareCircleIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M16,11h-3V6c0-.552-.448-1-1-1s-1,.448-1,1v6c0,.552,.448,1,1,1h4c.553,0,1-.448,1-1s-.447-1-1-1Z"/>
        <path fill="currentColor" d="M11.994,1C4.929,1.044,1,5.016,1,11.982s3.932,11.018,11.006,11.018c7.162,0,10.861-3.737,10.994-11.017-.122-7.037-4.026-10.938-11.006-10.983Zm.012,20c-6.026-.035-8.888-2.895-9.006-9,.113-6.019,3.059-8.963,8.994-9,5.873,.038,8.903,3.072,9.006,8.981-.112,6.117-2.974,8.983-8.994,9.019Z"/>
    </SvgIcon>
));

export const BlankIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    </SvgIcon>
));

export const InfoCommentIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M13.5,6.5a1.5,1.5,0,0,1-3,0A1.5,1.5,0,0,1,13.5,6.5ZM24,19V12.34A12.209,12.209,0,0,0,12.836.028,12,12,0,0,0,.029,12.854C.471,19.208,6.082,24,13.083,24H19A5.006,5.006,0,0,0,24,19ZM12.7,2.024A10.2,10.2,0,0,1,22,12.34V19a3,3,0,0,1-3,3H13.083C7.049,22,2.4,18.1,2.025,12.716A10,10,0,0,1,12.016,2C12.243,2,12.472,2.009,12.7,2.024ZM14,18V12a2,2,0,0,0-2-2H11a1,1,0,0,0,0,2h1v6a1,1,0,0,0,2,0Z"/>
    </SvgIcon>
));

export const InfoCircleIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm0,22A10,10,0,1,1,22,12,10.011,10.011,0,0,1,12,22Z"/>
        <path fill="currentColor" d="M12,10H11a1,1,0,0,0,0,2h1v6a1,1,0,0,0,2,0V12A2,2,0,0,0,12,10Z"/>
        <circle fill="currentColor" cx="12" cy="6.5" r="1.5"/>
    </SvgIcon>
));

export const InfoSquareCircleIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M11.994,1C4.929,1.044,1,5.011,1,12.019c0,6.891,3.933,10.94,11.006,10.981,7.162-.042,10.861-3.737,10.994-11.017-.122-7.037-4.026-10.938-11.006-10.983Zm.012,20c-6.026-.035-8.888-2.895-9.006-9,.113-6.019,3.059-8.963,8.994-9,5.874,.038,8.904,3.072,9.006,8.981-.112,6.117-2.974,8.983-8.994,9.019Z"/>
        <path fill="currentColor" d="M12.567,10.639h-1.134c-.552,0-1,.448-1,1s.448,1,1,1h.134v3.432c0,.552,.448,1,1,1s1-.448,1-1v-4.432c0-.552-.447-1-1-1Z"/>
        <circle fill="currentColor" cx="12" cy="7.931" r=".999"/>
    </SvgIcon>
));

export const InfoSquareCircleFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M11.994,1C4.929,1.044,1,5.027,1,11.982s3.933,10.977,11.006,11.018c7.162-.042,10.861-3.737,10.994-11.017-.122-7.037-4.026-10.938-11.006-10.983Zm.006,5.432c.828,0,1.5,.671,1.5,1.5s-.671,1.5-1.5,1.5-1.5-.671-1.5-1.5,.671-1.5,1.5-1.5Zm1.566,10.171c0,.552-.447,1-1,1s-1-.448-1-1v-3.432h-.134c-.552,0-1-.448-1-1s.448-1,1-1h1.134c.552,0,1,.448,1,1v4.432Z"/>
    </SvgIcon>
));

export const InfoCommentFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M12.836.028A12,12,0,0,0,.029,12.855C.47,19.208,6.082,24,13.083,24H19a5.006,5.006,0,0,0,5-5V12.34A12.209,12.209,0,0,0,12.836.028ZM12,5a1.5,1.5,0,0,1,0,3A1.5,1.5,0,0,1,12,5Zm2,13a1,1,0,0,1-2,0V12H11a1,1,0,0,1,0-2h1a2,2,0,0,1,2,2Z"/>
    </SvgIcon>
));

export const ColumnsFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m9,2h6v20h-6V2Zm10,0h-2v20h2c2.757,0,5-2.243,5-5V7c0-2.757-2.243-5-5-5Zm-12,0h-2C2.243,2,0,4.243,0,7v10c0,2.757,2.243,5,5,5h2V2Z"/>
    </SvgIcon>
));

export const FilterIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m14 24a1 1 0 0 1 -.6-.2l-4-3a1 1 0 0 1 -.4-.8v-5.62l-7.016-7.893a3.9 3.9 0 0 1 2.916-6.487h14.2a3.9 3.9 0 0 1 2.913 6.488l-7.013 7.892v8.62a1 1 0 0 1 -1 1zm-3-4.5 2 1.5v-7a1 1 0 0 1 .253-.664l7.268-8.177a1.9 1.9 0 0 0 -1.421-3.159h-14.2a1.9 1.9 0 0 0 -1.421 3.158l7.269 8.178a1 1 0 0 1 .252.664z"/>
    </SvgIcon>
));

export const FilterFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m14 24a1 1 0 0 1 -.6-.2l-4-3a1 1 0 0 1 -.4-.8v-5.62l-7.016-7.893a3.9 3.9 0 0 1 2.916-6.487h14.2a3.9 3.9 0 0 1 2.913 6.488l-7.013 7.892v8.62a1 1 0 0 1 -1 1z"/>
    </SvgIcon>
));

export const FilterListIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m18,5.92c0-2.162-1.758-3.92-3.92-3.92H3.92C1.758,2,0,3.758,0,5.92c0,.935.335,1.841.944,2.551l5.056,5.899v3.63c0,.315.148.611.4.8l4,3c.177.132.388.2.6.2.152,0,.306-.035.447-.105.339-.169.553-.516.553-.895v-6.63l5.056-5.899c.609-.71.944-1.616.944-2.551Zm-2.462,1.25l-5.297,6.18c-.155.181-.241.412-.241.651v5l-2-1.5v-3.5c0-.239-.085-.47-.241-.651L2.462,7.169c-.298-.348-.462-.792-.462-1.25,0-1.059.861-1.92,1.92-1.92h10.16c1.059,0,1.92.861,1.92,1.92,0,.458-.164.902-.462,1.25Zm8.462,12.831c0,.552-.448,1-1,1h-8c-.552,0-1-.448-1-1s.448-1,1-1h8c.552,0,1,.448,1,1Zm0-4c0,.552-.448,1-1,1h-8c-.552,0-1,.448-1,1s.448,1,1,1h8c.552,0,1-.448,1-1Zm-6-5h5c.552,0,1,.448,1,1s-.448,1-1,1h-5c-.552,0-1-.448-1-1s.448-1,1-1Z"/>
    </SvgIcon>
));

export const FilterListFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m11,22c-.212,0-.423-.068-.6-.2l-4-3c-.252-.188-.4-.485-.4-.8v-3.63L.944,8.471c-.609-.71-.944-1.616-.944-2.551,0-2.162,1.758-3.92,3.92-3.92h10.16c2.162,0,3.92,1.758,3.92,3.92,0,.935-.335,1.841-.944,2.551l-5.056,5.899v6.63c0,.379-.214.725-.553.895-.142.071-.295.105-.447.105Zm13-2c0-.552-.448-1-1-1h-8c-.552,0-1,.448-1,1s.448,1,1,1h8c.552,0,1-.448,1-1Zm0-4c0-.552-.448-1-1-1h-8c-.552,0-1,.448-1,1s.448,1,1,1h8c.552,0,1-.448,1-1Zm0-4c0-.552-.448-1-1-1h-5c-.552,0-1,.448-1,1s.448,1,1,1h5c.552,0,1-.448,1-1Z"/>
    </SvgIcon>
));

export const SettingsSlidersIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M1,4.75H3.736a3.728,3.728,0,0,0,7.195,0H23a1,1,0,0,0,0-2H10.931a3.728,3.728,0,0,0-7.195,0H1a1,1,0,0,0,0,2ZM7.333,2a1.75,1.75,0,1,1-1.75,1.75A1.752,1.752,0,0,1,7.333,2Z"/>
        <path fill="currentColor" d="M23,11H20.264a3.727,3.727,0,0,0-7.194,0H1a1,1,0,0,0,0,2H13.07a3.727,3.727,0,0,0,7.194,0H23a1,1,0,0,0,0-2Zm-6.333,2.75A1.75,1.75,0,1,1,18.417,12,1.752,1.752,0,0,1,16.667,13.75Z"/>
        <path fill="currentColor" d="M23,19.25H10.931a3.728,3.728,0,0,0-7.195,0H1a1,1,0,0,0,0,2H3.736a3.728,3.728,0,0,0,7.195,0H23a1,1,0,0,0,0-2ZM7.333,22a1.75,1.75,0,1,1,1.75-1.75A1.753,1.753,0,0,1,7.333,22Z"/>
    </SvgIcon>
));

export const SettingsSlidersFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512.051 512.051" {...props}>
        <path fill="currentColor" d="M21.359,101.359h58.368c11.52,42.386,55.219,67.408,97.605,55.888c27.223-7.399,48.489-28.665,55.888-55.888h257.472   c11.782,0,21.333-9.551,21.333-21.333s-9.551-21.333-21.333-21.333H233.22C221.7,16.306,178.001-8.716,135.615,2.804   c-27.223,7.399-48.489,28.665-55.888,55.888H21.359c-11.782,0-21.333,9.551-21.333,21.333S9.577,101.359,21.359,101.359z"/>
        <path fill="currentColor" d="M490.692,234.692h-58.368c-11.497-42.38-55.172-67.416-97.552-55.92c-27.245,7.391-48.529,28.674-55.92,55.92H21.359   c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h257.493c11.497,42.38,55.172,67.416,97.552,55.92   c27.245-7.391,48.529-28.674,55.92-55.92h58.368c11.782,0,21.333-9.551,21.333-21.333   C512.025,244.243,502.474,234.692,490.692,234.692z"/>
        <path fill="currentColor" d="M490.692,410.692H233.22c-11.52-42.386-55.219-67.408-97.605-55.888c-27.223,7.399-48.489,28.665-55.888,55.888H21.359   c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h58.368c11.52,42.386,55.219,67.408,97.605,55.888   c27.223-7.399,48.489-28.665,55.888-55.888h257.472c11.782,0,21.333-9.551,21.333-21.333   C512.025,420.243,502.474,410.692,490.692,410.692z"/>
    </SvgIcon>
));

export const FilterBarsIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M24,3.5c0,.83-.67,1.5-1.5,1.5H1.5c-.83,0-1.5-.67-1.5-1.5s.67-1.5,1.5-1.5H22.5c.83,0,1.5,.67,1.5,1.5ZM14.5,20h-5c-.83,0-1.5,.67-1.5,1.5s.67,1.5,1.5,1.5h5c.83,0,1.5-.67,1.5-1.5s-.67-1.5-1.5-1.5Zm4-9H5.5c-.83,0-1.5,.67-1.5,1.5s.67,1.5,1.5,1.5h13c.83,0,1.5-.67,1.5-1.5s-.67-1.5-1.5-1.5Z"/>
    </SvgIcon>
));

export const CategoryIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m0,3v7h10V0H3C1.346,0,0,1.346,0,3Zm8,5H2V3c0-.551.449-1,1-1h5v6Zm14-5c0-1.654-1.346-3-3-3h-7v10h10V3Zm-2,5h-6V2h5c.551,0,1,.449,1,1v5ZM0,19c0,1.654,1.346,3,3,3h7v-10H0v7Zm2-5h6v6H3c-.551,0-1-.449-1-1v-5Zm21.979,8.564l-2.812-2.812c.524-.791.833-1.736.833-2.753,0-2.757-2.243-5-5-5s-5,2.243-5,5,2.243,5,5,5c1.017,0,1.962-.309,2.753-.833l2.812,2.812,1.414-1.414Zm-6.979-2.564c-1.654,0-3-1.346-3-3s1.346-3,3-3,3,1.346,3,3-1.346,3-3,3Z"/>
    </SvgIcon>
));

export const CategoryFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m8,0h-3.5C2.015,0,0,2.015,0,4.5v3.5c0,1.105.895,2,2,2h6c1.105,0,2-.895,2-2V2c0-1.105-.895-2-2-2Zm6,10h6c1.105,0,2-.895,2-2v-3.5c0-2.485-2.015-4.5-4.5-4.5h-3.5c-1.105,0-2,.895-2,2v6c0,1.105.895,2,2,2Zm-6,2H2c-1.105,0-2,.895-2,2v3.5c0,2.485,2.015,4.5,4.5,4.5h3.5c1.105,0,2-.895,2-2v-6c0-1.105-.895-2-2-2Zm15.707,10.293l-2.54-2.54c.524-.791.833-1.736.833-2.753,0-2.757-2.243-5-5-5s-5,2.243-5,5,2.243,5,5,5c1.017,0,1.962-.309,2.753-.833l2.54,2.54c.195.195.451.293.707.293s.512-.098.707-.293c.391-.391.391-1.023,0-1.414Z"/>
    </SvgIcon>
));

export const AddSquareFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M19,0H5C2.243,0,0,2.243,0,5v14c0,2.757,2.243,5,5,5h14c2.757,0,5-2.243,5-5V5c0-2.757-2.243-5-5-5Zm-3,13h-3v3c0,.553-.448,1-1,1s-1-.447-1-1v-3h-3c-.552,0-1-.447-1-1s.448-1,1-1h3v-3c0-.553,.448-1,1-1s1,.447,1,1v3h3c.552,0,1,.447,1,1s-.448,1-1,1Z"/>
    </SvgIcon>
));

export const AddSquareIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M17,12c0,.553-.448,1-1,1h-3v3c0,.553-.448,1-1,1s-1-.447-1-1v-3h-3c-.552,0-1-.447-1-1s.448-1,1-1h3v-3c0-.553,.448-1,1-1s1,.447,1,1v3h3c.552,0,1,.447,1,1Zm7-7v14c0,2.757-2.243,5-5,5H5c-2.757,0-5-2.243-5-5V5C0,2.243,2.243,0,5,0h14c2.757,0,5,2.243,5,5Zm-2,0c0-1.654-1.346-3-3-3H5c-1.654,0-3,1.346-3,3v14c0,1.654,1.346,3,3,3h14c1.654,0,3-1.346,3-3V5Z"/>
    </SvgIcon>
));

export const AddSquareCircleFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M11.994,1C4.929,1.044,1,5.027,1,11.982s3.933,10.977,11.006,11.018c7.162-.042,10.861-3.737,10.994-11.017-.122-7.037-4.026-10.938-11.006-10.983Zm2.831,12h-1.824v1.825c0,.552-.447,1-1,1s-1-.448-1-1v-1.825h-1.824c-.553,0-1-.448-1-1s.447-1,1-1h1.824v-1.825c0-.552,.447-1,1-1s1,.448,1,1v1.825h1.824c.553,0,1,.448,1,1s-.447,1-1,1Z"/>
    </SvgIcon>
));

export const AddSquareCircleIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M14.824,11h-1.824v-1.825c0-.552-.447-1-1-1s-1,.448-1,1v1.825h-1.824c-.553,0-1,.448-1,1s.447,1,1,1h1.824v1.825c0,.552,.447,1,1,1s1-.448,1-1v-1.825h1.824c.553,0,1-.448,1-1s-.447-1-1-1Z"/>
        <path fill="currentColor" d="M11.994,1C4.929,1.044,1,5.011,1,12.019c0,6.891,3.933,10.94,11.006,10.981,7.162-.042,10.861-3.737,10.994-11.017-.122-7.037-4.026-10.938-11.006-10.983Zm.012,20c-6.026-.035-8.888-2.895-9.006-9,.113-6.019,3.059-8.963,8.994-9,5.874,.038,8.904,3.072,9.006,8.981-.112,6.117-2.974,8.983-8.994,9.019Z"/>
    </SvgIcon>
));

export const AddCircleFilledIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m12 0a12 12 0 1 0 12 12 12.013 12.013 0 0 0 -12-12zm4 13h-3v3a1 1 0 0 1 -2 0v-3h-3a1 1 0 0 1 0-2h3v-3a1 1 0 0 1 2 0v3h3a1 1 0 0 1 0 2z"/>
    </SvgIcon>
));

export const AddCircleIconV2: React.FC<IconProps> = React.memo(({ ...props }) => (
    <SvgIcon xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m12 0a12 12 0 1 0 12 12 12.013 12.013 0 0 0 -12-12zm0 22a10 10 0 1 1 10-10 10.011 10.011 0 0 1 -10 10zm5-10a1 1 0 0 1 -1 1h-3v3a1 1 0 0 1 -2 0v-3h-3a1 1 0 0 1 0-2h3v-3a1 1 0 0 1 2 0v3h3a1 1 0 0 1 1 1z"/>
    </SvgIcon>
));
