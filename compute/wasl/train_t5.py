from datasets import load_dataset
from transformers import T5Tokenizer, T5ForConditionalGeneration, Trainer, TrainingArguments

# Load cleaned CSV
dataset = load_dataset("csv", data_files="./aslg_pc12_cleaned_aux.csv")["train"]

# Tokenizer & Model
tokenizer = T5Tokenizer.from_pretrained("t5-small")
model = T5ForConditionalGeneration.from_pretrained("t5-small")

# Preprocessing
def tokenize(example):
    src = f"translate gloss to text: {example['gloss_clean']}"
    model_input = tokenizer(src, truncation=True, padding="max_length", max_length=64)
    with tokenizer.as_target_tokenizer():
        target = tokenizer(example["text"], truncation=True, padding="max_length", max_length=64)
    model_input["labels"] = target["input_ids"]
    return model_input

dataset = dataset.map(tokenize)

# Training args
args = TrainingArguments(
    output_dir="./t5-aslg",
    per_device_train_batch_size=16,
    num_train_epochs=2,
    weight_decay=0.01,
    report_to="wandb",
    run_name="t5-small-aslg",
    save_strategy="epoch",
    logging_dir="./logs",
)

# Trainer
trainer = Trainer(
    model=model,
    args=args,
    train_dataset=dataset,
    tokenizer=tokenizer,
)

# Train
trainer.train()