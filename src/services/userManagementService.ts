import api from '../lib/api';
export const userManagementService={
    async loadUsers():Promise<UserRoleRecord[]>
    {
        try {
            const response=await api.get('/users')
            return response.data
        } catch (error) {
            console.log("Failed to load users")
            throw new Error("Failed to get users!")
        }
    },
    async addUser(userId:string,role:string,permissions:any,projects:string[])
    {
        try {
            const response=await api.post('/users/addUser',{
                user_id:userId,
                role:role,
                permissions:permissions,
                projects:projects
            })
            return response.data
        } catch (error) {
            console.error("Failed to add user")
            throw new Error("Failed to add user")
        }
    },
    async deleteUser(user_id:string){
        try {
            const response=await api.delete('/delete-user',{
                params:{
                    user_id
                }
            })
            return response.data
        } catch (error) {
                        console.error("Failed to add user")
            throw new Error("Failed to add user")
        }
    }
}