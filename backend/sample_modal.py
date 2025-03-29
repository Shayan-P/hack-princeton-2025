# import sys

# import modal

# app = modal.App("example-modal")

# @app.function()
# @app.function()
# def add_numbers(a: int, b: int) -> int:
#     return a + b

# @app.local_entrypoint()
# def main():
#     result = add_numbers.remote(5, 3)
#     print(f"The sum is: {result}")






# import modal

# app = modal.App(image=modal.Image.debian_slim().pip_install("fastapi"))


# @app.function()
# @modal.fastapi_endpoint(method="GET")
# def f(name: str):
#     return f"I update on file edit! yohahahaha {name}"


# @app.function(schedule=modal.Period(seconds=1))
# def run_me():
#     print("I also update on file edit! yohahahaha")




# from fastapi import Request

# import modal

# image = modal.Image.debian_slim().pip_install("fastapi[standard]")
# app = modal.App(image=image, name="dumdum")


# @app.function()
# @modal.fastapi_endpoint()
# def get_ip_address(request: Request):
#     return f"Your IP address is {request.client.host}"



# import modal
# from fastapi import FastAPI

# web_app = FastAPI()
# stub = modal.Stub("example-web-app")

# @web_app.get("/hello/{name}")
# async def hello(name: str):
#     return {"message": f"Hello, {name}!"}

# @stub.function()
# @modal.asgi_app()
# def fastapi_app():
#     return web_app

# if __name__ == "__main__":
#     stub.serve()



import modal
import fastapi

fastapi_app = fastapi.FastAPI()

image = modal.Image.debian_slim().pip_install("fastapi[standard]")
app = modal.App(name="simple-adder")

@app.function()
def add_numbers(a: int, b: int):
    return {"sum": a + b}


@fastapi_app.get("/")
async def hello():
    return "Hello, World!"


@app.function()
@modal.asgi_app()
def fastapi_app():
    return fastapi_app


if __name__ == "__main__":
    app.serve()

