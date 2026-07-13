import { CONTRACT_ADDRESS } from './config'
export async function writeGns(address:string,functionName:'register'|'update_profile'|'set_address'|'set_primary'|'transfer',args:string[]){
 const {createClient}=await import('genlayer-js');const {testnetBradbury}=await import('genlayer-js/chains');type Config=NonNullable<Parameters<typeof createClient>[0]>;const provider=(window as Window&{ethereum?:Config['provider']}).ethereum;if(!provider)throw new Error('No injected wallet was found.')
 const client=createClient({chain:testnetBradbury,account:address as `0x${string}`,provider});return client.writeContract({address:CONTRACT_ADDRESS,functionName,args,value:BigInt(0)})
}
