import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

interface IconProps extends SvgIconProps {
  width?: string | number;
  height?: string | number;
}

export const HomeIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M9.02 2.84004L3.63 7.04004C2.73 7.74004 2 9.23004 2 10.36V17.77C2 20.09 3.89 21.99 6.21 21.99H17.79C20.11 21.99 22 20.09 22 17.78V10.5C22 9.29004 21.19 7.74004 20.2 7.05004L14.02 2.72004C12.62 1.74004 10.37 1.79004 9.02 2.84004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 17.99V14.99" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </SvgIcon>
));

export const CalendarAddIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M8 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.5 9.08997H20.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 23C20.2091 23 22 21.2091 22 19C22 16.7909 20.2091 15 18 15C15.7909 15 14 16.7909 14 19C14 21.2091 15.7909 23 18 23Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19.49 19.0499H16.51" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 17.59V20.58" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 8.5V16.36C20.27 15.53 19.2 15 18 15C15.79 15 14 16.79 14 19C14 19.75 14.21 20.46 14.58 21.06C14.79 21.42 15.06 21.74 15.37 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </SvgIcon>
));

export const CalendarIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M8 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.5 9.09009H20.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </SvgIcon>
));

export const ListIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M22 10V15C22 20 20 22 15 22H9C4 22 2 20 2 15V9C2 4 4 2 9 2H14" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 10H18C15 10 14 9 14 6V2L22 10Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 13H13" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 17H11" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </SvgIcon>
));

export const PersonListIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M8 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 8.5V13.63C20.11 12.92 18.98 12.5 17.75 12.5C16.52 12.5 15.37 12.93 14.47 13.66C13.26 14.61 12.5 16.1 12.5 17.75C12.5 18.73 12.78 19.67 13.26 20.45C13.63 21.06 14.11 21.59 14.68 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 11H13" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 16H9.62" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M23 17.75C23 18.73 22.72 19.67 22.24 20.45C21.96 20.93 21.61 21.35 21.2 21.69C20.28 22.51 19.08 23 17.75 23C16.6 23 15.54 22.63 14.68 22C14.11 21.59 13.63 21.06 13.26 20.45C12.78 19.67 12.5 18.73 12.5 17.75C12.5 16.1 13.26 14.61 14.47 13.66C15.37 12.93 16.52 12.5 17.75 12.5C18.98 12.5 20.11 12.92 21 13.63C22.22 14.59 23 16.08 23 17.75Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </SvgIcon>
));

export const PersonIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M12.12 12.78C12.05 12.77 11.96 12.77 11.88 12.78C10.12 12.72 8.71997 11.28 8.71997 9.50998C8.71997 7.69998 10.18 6.22998 12 6.22998C13.81 6.22998 15.28 7.69998 15.28 9.50998C15.27 11.28 13.88 12.72 12.12 12.78Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18.74 19.3801C16.96 21.0101 14.6 22.0001 12 22.0001C9.40001 22.0001 7.04001 21.0101 5.26001 19.3801C5.36001 18.4401 5.96001 17.5201 7.03001 16.8001C9.77001 14.9801 14.25 14.9801 16.97 16.8001C18.04 17.5201 18.64 18.4401 18.74 19.3801Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </SvgIcon>
));

export const PeopleIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M9.16 10.87C9.06 10.86 8.94 10.86 8.83 10.87C6.45 10.79 4.56 8.84 4.56 6.44C4.56 3.99 6.54 2 9 2C11.45 2 13.44 3.99 13.44 6.44C13.43 8.84 11.54 10.79 9.16 10.87Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.41 4C18.35 4 19.91 5.57 19.91 7.5C19.91 9.39 18.41 10.93 16.54 11C16.46 10.99 16.37 10.99 16.28 11" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.16 14.56C1.74 16.18 1.74 18.82 4.16 20.43C6.91 22.27 11.42 22.27 14.17 20.43C16.59 18.81 16.59 16.17 14.17 14.56C11.43 12.73 6.92 12.73 4.16 14.56Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18.34 20C19.06 19.85 19.74 19.56 20.3 19.13C21.86 17.96 21.86 16.03 20.3 14.86C19.75 14.44 19.08 14.16 18.37 14" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </SvgIcon>
));

export const RoundViewColumnIconV2: React.FC<IconProps> = React.memo(({ width = "24", height = "24", ...props }) => (
    <SvgIcon width={width} height={height} viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m15 20h-10a5.006 5.006 0 0 1 -5-5v-10a5.006 5.006 0 0 1 5-5h10a5.006 5.006 0 0 1 5 5v10a5.006 5.006 0 0 1 -5 5zm-10-18a3 3 0 0 0 -3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-10a3 3 0 0 0 -3-3zm19 17v-13a1 1 0 0 0 -2 0v13a3 3 0 0 1 -3 3h-13a1 1 0 0 0 0 2h13a5.006 5.006 0 0 0 5-5z"/>
    </SvgIcon>
));

export const UserIconSquareCircleV2: React.FC<IconProps> = React.memo(({ width = "20", height = "20", ...props }) => (
    <SvgIcon width={width} height={height} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m12 1c-7.71 0-11 3.29-11 11s3.29 11 11 11 11-3.29 11-11-3.29-11-11-11zm-4.293 19.475c.377-1.544 1.37-2.475 4.293-2.475s3.917.931 4.293 2.475c-1.176.357-2.594.525-4.293.525s-3.117-.168-4.293-.525zm10.413-.845c-1.012-3.217-3.916-3.631-6.119-3.631s-5.107.413-6.119 3.631c-2.028-1.35-2.881-3.774-2.881-7.631-.001-6.56 2.438-8.999 8.999-8.999s9 2.439 9 9c0 3.857-.853 6.281-2.881 7.631zm-6.12-13.63c-2.691 0-4 1.309-4 4s1.309 4 4 4 4-1.309 4-4-1.309-4-4-4zm0 6c-1.589 0-2-.411-2-2s.411-2 2-2 2 .411 2 2-.411 2-2 2z"/>
    </SvgIcon>
));

export const CirclePhoneFlipIconV2: React.FC<IconProps> = React.memo(({ width = "20", height = "20", ...props }) => (
    <SvgIcon width={width} height={height} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" stroke="currentColor" d="m1 12c0 9.75 5.879 11 11 11 7.71 0 11-3.29 11-11 0-9.75-5.878-11-11-11-7.71 0-11 3.29-11 11zm1 0c0-7.103 2.897-10 10-10s10 2.897 10 10-2.897 10-10 10-10-2.897-10-10z"/>
        <path fill="currentColor" stroke="currentColor" d="m6.164 14.162c-.295.904-.053 1.88.632 2.552.152.17 1.361 1.47 3.292 1.128 1.846-.326 3.842-1.641 5.012-2.756 1.141-1.169 2.44-3.151 2.799-4.97.371-1.997-1.101-3.239-1.164-3.291-.64-.653-1.629-.898-2.546-.605-.795.254-1.419.885-1.67 1.689-.287.921-.045 1.917.629 2.602l.112.113c-.176.503-.648 1.198-1.04 1.598-.398.38-1.105.85-1.614 1.022l-.119-.115c-.688-.666-1.696-.902-2.616-.621-.812.247-1.449.865-1.707 1.653zm.951.311c.156-.479.548-.855 1.047-1.007.579-.177 1.203-.03 1.631.383l.319.308c.113.109.276.159.425.134.846-.134 1.912-.904 2.386-1.357.47-.479 1.248-1.536 1.385-2.377.025-.158-.026-.318-.138-.432l-.311-.315c-.415-.42-.563-1.034-.386-1.601.153-.493.634-1.091 1.488-1.108.406-.008.801.162 1.099.463.08.07 1.116.963.855 2.366-.316 1.603-1.528 3.43-2.52 4.447-1.017.969-2.865 2.169-4.492 2.484-1.438.261-2.386-.838-2.397-.85-.419-.404-.569-.994-.392-1.537z"/>
    </SvgIcon>
));

export const CheckSquareCircleIconV2: React.FC<IconProps> = React.memo(({ width = "20", height = "20", ...props }) => (
    <SvgIcon width={width} height={height} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="m17.305 9.539c-1.312 2.053-3.18 4.626-6.001 6.319-.324.195-.731.19-1.05-.013-1.52-.963-2.661-1.995-3.594-3.248-.33-.443-.238-1.069.205-1.399.442-.33 1.069-.237 1.398.205.674.905 1.488 1.679 2.536 2.405 2.16-1.46 3.644-3.507 4.819-5.346.299-.466.917-.602 1.381-.304.466.298.602.916.305 1.381zm5.695 2.461c0 7.71-3.29 11-11 11s-11-3.29-11-11 3.29-11 11-11 11 3.29 11 11zm-2 0c0-6.561-2.439-9-9-9s-9 2.439-9 9 2.439 9 9 9 9-2.439 9-9z"/>
    </SvgIcon>
));

export const CheckSquareCircleFilledIconV2: React.FC<IconProps> = React.memo(({ width = "20", height = "20", ...props }) => (
    <SvgIcon width={width} height={height} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path d="m12 1c-7.71 0-11 3.29-11 11s3.29 11 11 11 11-3.29 11-11-3.29-11-11-11zm5.305 8.539c-1.312 2.053-3.18 4.626-6.001 6.319-.324.195-.731.19-1.05-.013-1.52-.963-2.661-1.995-3.594-3.248-.33-.443-.238-1.069.205-1.399.442-.33 1.069-.237 1.398.205.674.905 1.488 1.679 2.536 2.405 2.16-1.46 3.644-3.507 4.819-5.346.299-.466.917-.602 1.381-.304.466.298.602.916.305 1.381z"/>
    </SvgIcon>
));

export const UndoAltIconV2: React.FC<IconProps> = React.memo(({ width = "20", height = "20", ...props }) => (
    <SvgIcon width={width} height={height} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
        <path fill="currentColor" d="M22.535,8.46A4.965,4.965,0,0,0,19,7h0L2.8,7,7.1,2.7A1,1,0,0,0,5.682,1.288L.732,6.237a2.5,2.5,0,0,0,0,3.535l4.95,4.951A1,1,0,1,0,7.1,13.309L2.788,9,19,9h0a3,3,0,0,1,3,3v7a3,3,0,0,1-3,3H5a1,1,0,0,0,0,2H19a5.006,5.006,0,0,0,5-5V12A4.969,4.969,0,0,0,22.535,8.46Z"/>
    </SvgIcon>
)); 