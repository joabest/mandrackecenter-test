import KeysManager from '../../../components/keys-manager';
export default async function Page({searchParams}){const p=await searchParams;const id=/^\d{1,20}$/.test(String(p?.user||''))?String(p.user):'';return <KeysManager admin initialTarget={id}/>}
