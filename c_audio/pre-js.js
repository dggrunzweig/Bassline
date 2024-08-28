import { Buffer } from 'buffer';

const atob = (a) => {
    return Buffer.from(a, 'base64').toString('binary');
};
