import {toast} from 'sonner'
export const notify={
    success:(message:string,description?:string)=>{
        toast.success(message,{description})
    },
    error:(message:string,description?:string)=>{
        toast.error(message,{
            description,
            duration:3000
        })
    },
    info:(message:string,description?:string)=>{
        toast.info(message,{description})
    },
    promise:async(promise:Promise<any>,{
        loading='Processing data...',
        success="Operation successful",
        error="An error occured"
    })=>{
        return toast.promise(promise,{
            loading,success,error
        })
    }
}