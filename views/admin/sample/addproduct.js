Router.post('/singup', async(req,res) =>{
    const {email,password} =req.body

    try {
        
        const exit = await User.findOne({email})

        if(exit){
            return res.status(400).json({message: " sdbvusf"})
        }

        const use = new user({email,password})
        await use.save()
        res.status(201).json({message:"jhdbdys",redirect : "/home"})

    } catch (error) {
            res.status(500).json({message:"sdvd"})        
    }
})