import modal
from PIL import Image

CharacterClassifier = modal.Cls.from_name("HP", "CharacterClassifier")


if __name__ == "__main__":
    char_classifier = CharacterClassifier()
    image = Image.open('../shared/sample_image.jpg')
    print(char_classifier.classify_character.remote(image))
