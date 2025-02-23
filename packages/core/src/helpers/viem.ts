import type { Abi, Narrow } from 'abitype'
import type {
  Address,
  ContractFunctionArgs,
  ContractFunctionName,
  PublicClient,
  ReadContractReturnType,
} from 'viem'

export async function getContractCall<
  TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi, 'view' | 'pure'>,
>({
  client,
  address,
  abi,
  functionName,
  args = undefined,
}: {
  client: PublicClient
  address: Address
  abi: Narrow<TAbi>
  functionName: TFunctionName
  args?: ContractFunctionArgs<TAbi, 'view' | 'pure'>
}) {
  return client.readContract({
    address,
    abi,
    functionName,
    args,
  }) as ReadContractReturnType<TAbi, TFunctionName>
}
