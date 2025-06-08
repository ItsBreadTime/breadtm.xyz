<script>
	import { page } from "$app/state";
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 text-gray-200 p-4 relative overflow-hidden">
    <div class="stars absolute inset-0 opacity-30"></div>
    <div class="grid-pattern absolute inset-0 opacity-10"></div>
    
    <div class="relative z-10 max-w-lg w-full bg-black/40 backdrop-blur-md p-8 rounded-2xl border-4 border-red-500/50 shadow-2xl text-center">
        <div class="animate-pulse mb-2">
            <span class="inline-block px-4 py-1 bg-red-500 text-white text-sm rounded-full font-mono">Error {page.status}</span>
        </div>
        
        <h1 class="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-600 drop-shadow-lg">{page.status}</h1>
        
        <div class="w-32 h-1 bg-gradient-to-r from-red-500 to-purple-500 rounded-full mx-auto my-6"></div>
        
        <h2 class="font-mono text-xl md:text-3xl mb-8 text-red-200">{page.error?.message || "Something went wrong"}</h2>
        
        <div class="flex flex-col md:flex-row gap-4 justify-center items-center">
            <a class="group py-3 px-6 rounded-xl text-lg bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white font-bold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg border-2 border-indigo-900/50 w-full md:w-auto" href="/">
                <span class="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Return Home
                </span>
            </a>
            
            <a class="py-3 px-6 rounded-xl text-lg bg-transparent hover:bg-purple-900/30 text-purple-300 font-medium transition-all duration-300 border-2 border-purple-500/30 hover:border-purple-400 w-full md:w-auto" href="/contact">
                <span class="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Report Issue
                </span>
            </a>
        </div>
    </div>
    
    <div class="mt-6 text-sm text-gray-400 relative z-10">
        Lost? Try refreshing or navigating back to a different section.
    </div>
</div>

<style>
    .stars {
        background-image: 
            radial-gradient(2px 2px at 20px 30px, white, rgba(0, 0, 0, 0)),
            radial-gradient(2px 2px at 40px 70px, white, rgba(0, 0, 0, 0)),
            radial-gradient(2px 2px at 50px 160px, white, rgba(0, 0, 0, 0)),
            radial-gradient(2px 2px at 90px 40px, white, rgba(0, 0, 0, 0)),
            radial-gradient(2px 2px at 130px 80px, white, rgba(0, 0, 0, 0)),
            radial-gradient(2px 2px at 160px 120px, white, rgba(0, 0, 0, 0));
        background-repeat: repeat;
        background-size: 200px 200px;
    }
    
    .grid-pattern {
        background-image: linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
        background-size: 20px 20px;
    }
</style>
